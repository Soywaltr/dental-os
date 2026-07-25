import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

// Mismo Client ID público que usa el frontend (src/main.jsx) — no es un secreto,
// por eso va hardcodeado aquí en vez de pedirlo como variable de entorno.
const GOOGLE_CLIENT_ID = '849091491290-t1h1q1p8j40rhndjlosh0e0dsokm5907.apps.googleusercontent.com'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
    if (!GOOGLE_CLIENT_SECRET) {
      throw new Error('Falta configurar GOOGLE_CLIENT_SECRET en los secretos de Supabase (Project Settings > Edge Functions).')
    }

    const { action, code, refreshToken } = await req.json()

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    })

    if (action === 'exchange') {
      if (!code) throw new Error('Falta el parámetro code.')
      params.set('code', code)
      params.set('grant_type', 'authorization_code')
      // Los códigos del flujo "auth-code" en modo popup de Google Identity Services
      // (usado por @react-oauth/google) se intercambian con este valor especial —
      // no hay una URL de redirect HTTP real de por medio en modo popup.
      params.set('redirect_uri', 'postmessage')
    } else if (action === 'refresh') {
      if (!refreshToken) throw new Error('Falta el parámetro refreshToken.')
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
      throw new Error(tokenData.error_description || tokenData.error || 'Google rechazó la solicitud de token.')
    }

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token, // solo viene presente en 'exchange', y no siempre
        expires_in: tokenData.expires_in,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
