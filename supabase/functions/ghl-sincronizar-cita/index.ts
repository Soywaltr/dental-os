import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Sincroniza el contacto de GoHighLevel cada vez que se crea o edita una cita
// en la Agenda -- SOLO actualiza el contacto (upsert), nunca envia mensajes:
// el envio real del recordatorio lo hace un Workflow armado en GHL, disparado
// por la etiqueta "cita-proxima" que esta funcion le agrega al contacto.
//
// Es deliberadamente "no bloqueante" desde el punto de vista de quien la
// llama (Agenda.jsx): si GHL falla o no esta configurado, la cita en
// DentalOS ya quedo guardada de todas formas -- esto es un efecto secundario,
// no el flujo principal.

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

const GHL_BASE = 'https://services.leadconnectorhq.com'
const GHL_VERSION = '2021-07-28'
const ETIQUETA_RECORDATORIO = 'cita-proxima'

// Las "fieldKey" de los custom fields de contacto en la cuenta de GHL de la
// clinica -- no son secretas (son solo identificadores, como los merge tags
// {{contact.fecha_de_cita}} que usa un Workflow), por eso van fijas en el
// codigo en vez de como secreto de Supabase. El ID real (el que pide el API
// de upsert) se resuelve en cada llamada via GET /customFields -- asi no
// hace falta ir a buscar el ID a mano en el panel de GHL.
const CLAVES_CAMPOS = {
  fecha: 'contact.fecha_de_cita',
  hora: 'contact.hora_de_cita',
  motivo: 'contact.motivo_de_cita',
}

async function resolverIdsDeCampos(apiKey: string, locationId: string) {
  try {
    const res = await fetch(`${GHL_BASE}/locations/${locationId}/customFields?model=contact`, {
      headers: { Authorization: `Bearer ${apiKey}`, Version: GHL_VERSION },
    })
    if (!res.ok) return {}
    const data = await res.json()
    const idPorClave: Record<string, string> = {}
    for (const campo of data.customFields || []) {
      if (campo.fieldKey && campo.id) idPorClave[campo.fieldKey] = campo.id
    }
    return idPorClave
  } catch {
    return {}
  }
}

// Los numeros en la app se guardan como celular local (9 digitos, Peru) sin
// codigo de pais -- GHL espera formato E.164 para poder mandar WhatsApp/SMS.
function normalizarTelefono(telefono: string) {
  const limpio = (telefono || '').replace(/[^\d+]/g, '')
  if (!limpio) return ''
  return limpio.startsWith('+') ? limpio : `+51${limpio}`
}

serve(async (req: Request) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const GHL_API_KEY = Deno.env.get('GHL_API_KEY')
    const GHL_LOCATION_ID = Deno.env.get('GHL_LOCATION_ID')
    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      throw new Error('Falta configurar GHL_API_KEY / GHL_LOCATION_ID en los secretos de Supabase.')
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'Falta el encabezado Authorization.' }, 401, corsHeaders)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ error: 'No autenticado.' }, 401, corsHeaders)

    const { nombre, telefono, email, fecha, hora, motivo } = await req.json()
    if (!nombre || !telefono) return json({ error: 'Faltan nombre o telefono del paciente.' }, 400, corsHeaders)

    const telefonoNormalizado = normalizarTelefono(telefono)

    // Si algun campo no existe con esa clave exacta en la cuenta de GHL
    // (typo, o todavia no se creo), simplemente se omite del payload en vez
    // de fallar: el contacto y la etiqueta igual se sincronizan.
    const idPorClave = await resolverIdsDeCampos(GHL_API_KEY, GHL_LOCATION_ID)
    const customFields: Array<{ id: string; field_value: string }> = []
    if (idPorClave[CLAVES_CAMPOS.fecha] && fecha) customFields.push({ id: idPorClave[CLAVES_CAMPOS.fecha], field_value: fecha })
    if (idPorClave[CLAVES_CAMPOS.hora] && hora) customFields.push({ id: idPorClave[CLAVES_CAMPOS.hora], field_value: hora })
    if (idPorClave[CLAVES_CAMPOS.motivo] && motivo) customFields.push({ id: idPorClave[CLAVES_CAMPOS.motivo], field_value: motivo })

    const body: Record<string, unknown> = {
      locationId: GHL_LOCATION_ID,
      name: nombre,
      phone: telefonoNormalizado,
      tags: [ETIQUETA_RECORDATORIO],
      source: 'DentalOS',
    }
    if (email) body.email = email
    if (customFields.length > 0) body.customFields = customFields

    const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Version': GHL_VERSION,
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'GoHighLevel rechazó la solicitud.')

    return json({ ok: true, nuevo: data?.new ?? null }, 200, corsHeaders)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Error desconocido' }, 400, corsHeaders)
  }
})
