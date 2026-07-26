import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

const GRAPH_VERSION = 'v21.0'

serve(async (req: Request) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, redirectUri } = await req.json()
    if (!code || !redirectUri) {
      throw new Error('Faltan parámetros code/redirectUri.')
    }

    const META_APP_ID = Deno.env.get('META_APP_ID')
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET')
    if (!META_APP_ID || !META_APP_SECRET) {
      throw new Error('Falta configurar META_APP_ID y META_APP_SECRET en los secretos de Supabase (Project Settings > Edge Functions).')
    }

    // 1) Intercambiar el código de autorización por un access token de usuario
    const tokenUrl = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id', META_APP_ID)
    tokenUrl.searchParams.set('client_secret', META_APP_SECRET)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenRes = await fetch(tokenUrl.toString())
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.error?.message || 'Meta rechazó el intercambio del código de autorización.')
    }
    const accessToken = tokenData.access_token

    // 2) Listar los negocios (Business Manager) a los que el usuario dio acceso.
    // La cuenta de WhatsApp Business específica (WABA) y el número de teléfono
    // se seleccionan en un paso posterior una vez haya credenciales reales para
    // probar contra la API real de Meta (la forma exacta de listarlos depende
    // de cómo se configuró la app: Embedded Signup vs. permisos manuales).
    const bizRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/businesses?access_token=${accessToken}`)
    const bizData = await bizRes.json()

    return new Response(
      JSON.stringify({ accessToken, businesses: bizData.data || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
