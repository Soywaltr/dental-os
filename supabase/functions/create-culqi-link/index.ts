import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, description } = await req.json()

    // 🔴 1. ¡TU LLAVE SECRETA DE CULQI AQUÍ! 🔴
    const CULQI_SECRET_KEY = 'sk_test_AQUI_TU_LLAVE_SECRETA_NUEVAMENTE' 

    // 2. Armar el paquete de datos específicamente para "CulqiLink"
    const linkPayload = {
      amount: Math.round(amount * 100), // En céntimos
      currency_code: "PEN", // Soles peruanos
      concept: description, // Así pide Culqi el nombre o concepto del link
      limit_uses: 1, // El link expira después de 1 pago exitoso
      is_open_amount: false // El monto es fijo, el paciente no puede cambiarlo
    }

    // 3. Llamar a la API de LINKS de Culqi
    const response = await fetch('https://api.culqi.com/v2/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CULQI_SECRET_KEY}`,
        'x-culqi-product': 'link' // Obligatorio según la documentación
      },
      body: JSON.stringify(linkPayload)
    })

    const culqiData = await response.json()

    if (!response.ok) {
      throw new Error(culqiData.user_message || culqiData.merchant_message || 'Error al crear el link en Culqi')
    }

    // 4. Culqi ahora nos devuelve directamente el link mágico
    return new Response(
      JSON.stringify({ paymentUrl: culqiData.url, linkId: culqiData.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
