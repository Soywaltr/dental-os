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

const MONTO_MAXIMO = 50000 // S/ — tope de cordura; el monto lo manda el cliente

serve(async (req: Request) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // La llave secreta vive en los secretos del proyecto, nunca en el código:
    // este archivo está en un repositorio público.
    const CULQI_SECRET_KEY = Deno.env.get('CULQI_SECRET_KEY')
    if (!CULQI_SECRET_KEY) {
      throw new Error('Falta configurar CULQI_SECRET_KEY en los secretos de Supabase (Project Settings > Edge Functions).')
    }

    const { amount, description } = await req.json()

    // El monto llega del navegador, así que no se puede confiar en él.
    const monto = Number(amount)
    if (!Number.isFinite(monto) || monto <= 0 || monto > MONTO_MAXIMO) {
      throw new Error(`Monto inválido: debe ser un número entre 0 y ${MONTO_MAXIMO}.`)
    }
    const concepto = String(description ?? '').trim().slice(0, 200)
    if (!concepto) throw new Error('Falta la descripción del cobro.')

    const linkPayload = {
      amount: Math.round(monto * 100),
      currency_code: 'PEN',
      concept: concepto,
      limit_uses: 1,
      is_open_amount: false,
    }

    const response = await fetch('https://api.culqi.com/v2/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CULQI_SECRET_KEY}`,
        'x-culqi-product': 'link',
      },
      body: JSON.stringify(linkPayload),
    })

    const culqiData = await response.json()
    if (!response.ok) {
      throw new Error(culqiData.user_message || 'Error en Culqi')
    }

    return new Response(
      JSON.stringify({ paymentUrl: culqiData.checkout_url || culqiData.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
