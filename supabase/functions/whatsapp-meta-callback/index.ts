import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GRAPH_VERSION = 'v21.0'

serve(async (req: Request) => {
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
