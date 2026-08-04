import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Genera una "vista previa de sonrisa" con IA: edita una foto real del
// paciente para mostrar una aproximacion ilustrativa de dientes alineados.
// OJO -- esto NUNCA es una simulacion clinica real (para eso hace falta un
// scanner 3D como iTero, no una foto de celular): es una imagen generada por
// un modelo de IA a partir de una sola foto, y el frontend siempre la muestra
// con esa aclaracion. Este archivo solo genera y guarda la imagen; la
// responsabilidad de mostrar el disclaimer es de la UI (Ortodoncia.jsx).

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

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { headers: { ...headers, 'Content-Type': 'application/json' }, status })

const BUCKET = 'imagenes'
const MODELO_IMAGEN = 'gpt-image-2'
const PROMPT_VISTA_PREVIA = 'Edita esta fotografia dental/facial manteniendo exactamente el mismo rostro, piel, labios, iluminacion, angulo de camara y fondo. Ajusta unicamente la posicion y alineacion de los dientes visibles para mostrar una aproximacion ilustrativa de como se verian derechos y bien alineados tras un tratamiento de ortodoncia exitoso. No cambies ningun otro elemento de la imagen.'

serve(async (req: Request) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      throw new Error('Falta configurar OPENAI_API_KEY en los secretos de Supabase (Project Settings > Edge Functions).')
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'Falta el encabezado Authorization.' }, 401, corsHeaders)

    // Ligado al JWT de quien pregunta: la descarga de la foto original hereda
    // el mismo RLS de aislamiento por clinica que el resto de la app.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ error: 'No autenticado.' }, 401, corsHeaders)

    const { rutaFoto, pacienteId, clinicaId } = await req.json()
    if (!rutaFoto || !pacienteId || !clinicaId) {
      return json({ error: 'Faltan datos (rutaFoto, pacienteId o clinicaId).' }, 400, corsHeaders)
    }

    const { data: blobOriginal, error: descargaError } = await supabase.storage.from(BUCKET).download(rutaFoto)
    if (descargaError || !blobOriginal) {
      throw new Error('No se pudo leer la foto original: ' + (descargaError?.message || 'no encontrada'))
    }

    const formData = new FormData()
    formData.append('model', MODELO_IMAGEN)
    formData.append('image', blobOriginal, 'foto.jpg')
    formData.append('prompt', PROMPT_VISTA_PREVIA)
    formData.append('size', '1024x1024')
    formData.append('quality', 'medium')

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error?.message || 'OpenAI rechazó la solicitud.')

    const b64 = data?.data?.[0]?.b64_json
    if (!b64) throw new Error('OpenAI no devolvió una imagen generada.')

    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const rutaGenerada = `${clinicaId}/ortodoncia/preview-${pacienteId}-${Date.now()}.png`
    const { error: subeError } = await supabase.storage.from(BUCKET).upload(rutaGenerada, bytes, { contentType: 'image/png' })
    if (subeError) throw new Error('No se pudo guardar la vista previa generada: ' + subeError.message)

    return json({ ruta: rutaGenerada }, 200, corsHeaders)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Error desconocido' }, 400, corsHeaders)
  }
})
