import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Orígenes permitidos. Antes era '*': con verify_jwt cualquier origen podía
// invocar la función si conseguía un token válido. Se puede ampliar con el
// secreto ALLOWED_ORIGINS (lista separada por comas) sin volver a desplegar.
const DEFAULT_ORIGINS = [
  'https://drasolvargas.com',
  'https://www.drasolvargas.com',
  'http://localhost:5173',
]
const allowedOrigins = () => {
  const extra = Deno.env.get('ALLOWED_ORIGINS')
  return extra ? extra.split(',').map(o => o.trim()).filter(Boolean) : DEFAULT_ORIGINS
}
const corsFor = (req: Request) => {
  const origin = req.headers.get('origin') ?? ''
  const permitido = allowedOrigins().includes(origin)
  return {
    'Access-Control-Allow-Origin': permitido ? origin : DEFAULT_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Mismo Client ID público que usa el frontend (src/main.jsx) — no es un secreto,
// por eso va aquí en vez de pedirlo como variable de entorno.
const GOOGLE_CLIENT_ID = '849091491290-t1h1q1p8j40rhndjlosh0e0dsokm5907.apps.googleusercontent.com'

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { headers: { ...headers, 'Content-Type': 'application/json' }, status })

serve(async (req: Request) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
    if (!GOOGLE_CLIENT_SECRET) {
      throw new Error('Falta configurar GOOGLE_CLIENT_SECRET en los secretos de Supabase (Project Settings > Edge Functions).')
    }

    // Cliente ligado al JWT de quien llama: hereda su identidad y, por lo tanto,
    // el RLS. Así la clínica se deduce del token de sesión y no de lo que diga
    // el navegador. Antes la función recibía el refresh_token en el body, lo que
    // la convertía en un oráculo: cualquier usuario autenticado podía hacerle
    // canjear tokens arbitrarios usando nuestro client secret.
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ error: 'No autenticado.' }, 401, corsHeaders)

    const { data: membresia } = await supabase
      .from('usuarios_clinica').select('clinica_id').eq('user_id', user.id).limit(1)
    const clinicaId = membresia?.[0]?.clinica_id
    if (!clinicaId) return json({ error: 'El usuario no pertenece a ninguna clínica.' }, 403, corsHeaders)

    const { action, code } = await req.json()

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    })

    if (action === 'exchange') {
      if (!code || typeof code !== 'string') throw new Error('Falta el parámetro code.')
      params.set('code', code)
      params.set('grant_type', 'authorization_code')
      // Los códigos del flujo "auth-code" en modo popup de Google Identity Services
      // (usado por @react-oauth/google) se intercambian con este valor especial —
      // no hay una URL de redirect HTTP real de por medio en modo popup.
      params.set('redirect_uri', 'postmessage')
    } else if (action === 'refresh') {
      // El refresh token se lee de la base con el RLS del usuario: solo puede
      // renovar el de su propia clínica, aunque manipule la petición.
      const { data: fila } = await supabase
        .from('integraciones_google').select('refresh_token').eq('clinica_id', clinicaId).limit(1)
      const refreshToken = fila?.[0]?.refresh_token
      if (!refreshToken) return json({ error: 'No hay una conexión de Google guardada para esta clínica.' }, 404, corsHeaders)
      params.set('refresh_token', refreshToken)
      params.set('grant_type', 'refresh_token')
    } else {
      throw new Error('Acción no reconocida: ' + action)
    }

    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      // Se devuelve el código crudo de Google además del mensaje: el cliente
      // distingue 'invalid_grant' (permiso revocado — hay que reconectar) de un
      // fallo pasajero, para no borrar la conexión guardada por un error de red.
      return json({
        error: tokenData.error_description || tokenData.error || 'Google rechazó la solicitud de token.',
        error_code: tokenData.error || null,
      }, 200, corsHeaders)
    }

    // La función es la única que escribe los tokens: el navegador ya no los ve
    // ni los guarda. Solo recibe de vuelta el access_token, que es efímero.
    const expiraEn = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000).toISOString()
    const fila: Record<string, unknown> = {
      clinica_id: clinicaId,
      access_token: tokenData.access_token,
      token_expires_at: expiraEn,
      updated_at: new Date().toISOString(),
    }
    if (action === 'exchange') {
      if (!tokenData.refresh_token) {
        return json({
          error: 'Google no entregó un refresh_token. Revoca el acceso de la app en myaccount.google.com/permissions e inténtalo de nuevo.',
          error_code: 'no_refresh_token',
        }, 200, corsHeaders)
      }
      fila.refresh_token = tokenData.refresh_token
      fila.connected_at = new Date().toISOString()
    }

    const { error: dbError } = await supabase
      .from('integraciones_google').upsert(fila, { onConflict: 'clinica_id' })
    if (dbError) return json({ error: 'No se pudo guardar la conexión: ' + dbError.message }, 200, corsHeaders)

    return json({ access_token: tokenData.access_token, expires_in: tokenData.expires_in }, 200, corsHeaders)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Error desconocido' }, 400, corsHeaders)
  }
})
