import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Anthropic from "npm:@anthropic-ai/sdk@0.32.1"

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

const SYSTEM_PROMPT = `Eres Nanda, la asistente virtual de WhatsApp del Consultorio Dra. Sol Vargas (Cirujano Dentista), en Los Diamantes 178, Trujillo, Perú. WhatsApp: +51 915 054 145. Horario: Lunes a Sábado.

Precios de referencia:
- Consulta / diagnóstico: S/30
- Limpieza y profilaxis: S/60
- Blanqueamiento clínico: S/180
- Carillas de porcelana: S/350
- Corona metal-cerámica: S/480
- Ortodoncia: desde S/1,800
- Implante dental: S/1,200

Reglas:
- Responde siempre en español, de forma breve, cálida y profesional (mensajes de WhatsApp, no párrafos largos).
- Si preguntan por una cita, ofrece coordinar horario y pide su nombre completo si no lo tienes.
- Nunca des un diagnóstico médico; para dolor o urgencias, recomienda agendar una consulta cuanto antes.
- No menciones precios ni servicios de otros consultorios.
- Si no sabes algo con certeza, dilo y ofrece que la Dra. Sol Vargas lo confirme directamente.`

serve(async (req: Request) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { history, message } = await req.json()

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) {
      throw new Error('Falta configurar el secreto ANTHROPIC_API_KEY en Supabase (Project Settings > Edge Functions).')
    }

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

    const messages = (Array.isArray(history) ? history : []).map((m: { from: string; txt: string }) => ({
      role: m.from === 'bot' ? 'assistant' as const : 'user' as const,
      content: m.txt,
    }))
    messages.push({ role: 'user', content: message })

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages,
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const reply = textBlock && 'text' in textBlock ? textBlock.text : 'Disculpa, ¿puedes repetir tu consulta?'

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
