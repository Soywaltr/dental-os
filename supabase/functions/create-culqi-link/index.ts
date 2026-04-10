import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, description } = await req.json()

    // 1. LLAVE SECRETA DE CULQI
    const CULQI_SECRET_KEY = 'sk_test_AQUI_TU_LLAVE_NUEVAMENTE'

    const linkPayload = {
      amount: Math.round(amount * 100),
      currency_code: "PEN",
      concept: description,
      limit_uses: 1,
      is_open_amount: false
    }

    const response = await fetch('https://api.culqi.com/v2/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CULQI_SECRET_KEY}`,
        'x-culqi-product': 'link'
      },
      body: JSON.stringify(linkPayload)
    })

    const culqiData = await response.json()

    if (!response.ok) {
      throw new Error(culqiData.user_message || 'Error en Culqi')
    }

    return new Response(
      JSON.stringify({ paymentUrl: culqiData.checkout_url || culqiData.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})