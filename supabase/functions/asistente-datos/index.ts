import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Reemplaza el placeholder "Chat IA" (antes WhatsApp.jsx): un asistente para
// EL DOCTOR/ADMIN, no para pacientes. Responde preguntas sobre los propios
// datos de la clinica en lenguaje natural.
//
// El modelo tiene 5 herramientas puntuales mas una generica ("consulta_sql")
// para todo lo demas. La generica NUNCA puede escribir: pasa por la funcion
// de Postgres `ejecutar_consulta_solo_lectura`, que rechaza cualquier cosa
// que no sea un SELECT sobre las tablas de negocio permitidas. Todas las
// herramientas corren con un cliente de Supabase ligado al JWT de quien
// pregunta -- el mismo patron que google-calendar-token/mfa-admin-reset --
// asi que el RLS de aislamiento por clinica sigue aplicando solo, sin que el
// modelo pueda ver nada fuera de la clinica de quien pregunta.

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

const MODEL = 'gpt-5.6-terra'
const OPENAI_URL = 'https://api.openai.com/v1/responses'

// ─── HERRAMIENTAS ────────────────────────────────────────────────────────────
// Cada una recibe el cliente de Supabase ya ligado al JWT del que pregunta.

async function resumenFinanciero(supabase: any, mes?: string) {
  const ahora = new Date()
  const [anio, mesNum] = mes ? mes.split('-').map(Number) : [ahora.getFullYear(), ahora.getMonth() + 1]
  const inicio = `${anio}-${String(mesNum).padStart(2, '0')}-01`
  const ultimoDia = new Date(anio, mesNum, 0).getDate()
  const fin = `${anio}-${String(mesNum).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

  const { data: historias, error: errHistorias } = await supabase.from('historias').select('plan_tratamiento')
  if (errHistorias) throw new Error('No se pudo leer historias: ' + errHistorias.message)
  const items = (historias || []).flatMap((h: any) => h.plan_tratamiento || [])
  const delMes = items.filter((i: any) => i.date >= inicio && i.date <= fin)
  const facturado = delMes.reduce((s: number, i: any) => s + (i.cost || 0), 0)
  const cobrado = delMes.reduce((s: number, i: any) => s + (i.paid || 0), 0)

  const { data: gastosData, error: errGastos } = await supabase.from('gastos').select('monto').gte('fecha', inicio).lte('fecha', fin)
  if (errGastos) throw new Error('No se pudo leer gastos: ' + errGastos.message)
  const gastos = (gastosData || []).reduce((s: number, g: any) => s + (g.monto || 0), 0)

  return {
    mes: `${anio}-${String(mesNum).padStart(2, '0')}`,
    facturado, cobrado, pendiente_de_cobro: facturado - cobrado,
    gastos, utilidad_estimada: cobrado - gastos,
  }
}

async function pacientesConSaldoPendiente(supabase: any) {
  const { data: historias, error: errHistorias } = await supabase.from('historias').select('patient_id, plan_tratamiento')
  if (errHistorias) throw new Error('No se pudo leer historias: ' + errHistorias.message)
  const { data: pacientes, error: errPacientes } = await supabase.from('pacientes').select('id, name')
  if (errPacientes) throw new Error('No se pudo leer pacientes: ' + errPacientes.message)
  const nombrePorId: Record<string, string> = Object.fromEntries((pacientes || []).map((p: any) => [String(p.id), p.name]))

  const resultado = []
  for (const h of historias || []) {
    const items = h.plan_tratamiento || []
    const saldo = items.reduce((s: number, i: any) => s + ((i.cost || 0) - (i.paid || 0)), 0)
    if (saldo > 0) resultado.push({ paciente: nombrePorId[String(h.patient_id)] || `Paciente #${h.patient_id}`, saldo_pendiente: saldo })
  }
  return resultado.sort((a, b) => b.saldo_pendiente - a.saldo_pendiente).slice(0, 30)
}

async function citasProximas(supabase: any, dias = 7) {
  const hoy = new Date()
  const hoyStr = hoy.toISOString().slice(0, 10)
  const limite = new Date(hoy.getTime() + dias * 86400000).toISOString().slice(0, 10)
  const { data, error } = await supabase.from('pacientes')
    .select('name, fecha, hora_cita, reason, treatment')
    .gte('fecha', hoyStr).lte('fecha', limite)
    .order('fecha').order('hora_cita')
  if (error) throw new Error('No se pudo leer citas: ' + error.message)
  return (data || []).map((p: any) => ({ paciente: p.name, fecha: p.fecha, hora: p.hora_cita, motivo: p.treatment || p.reason }))
}

async function buscarPaciente(supabase: any, texto: string) {
  // Se limpian comas y parentesis: son caracteres con significado especial en
  // el filtro .or() de PostgREST, y `texto` llega derivado de lo que el
  // usuario le escribió al modelo -- no es una amenaza de fuga (el RLS sigue
  // acotando a la propia clínica pase lo que pase), pero evita filtros raros.
  const limpio = (texto || '').replace(/[,()]/g, '').slice(0, 100)
  if (!limpio) return []
  const { data, error } = await supabase.from('pacientes')
    .select('name, doc, phone, email, treatment, fecha, hora_cita')
    .or(`name.ilike.%${limpio}%,doc.ilike.%${limpio}%`)
    .limit(10)
  if (error) throw new Error('No se pudo buscar el paciente: ' + error.message)
  return data || []
}

async function resumenLaboratorio(supabase: any) {
  const { data, error } = await supabase.from('laboratorio_ordenes')
    .select('patient_name, type, lab, status, eta').order('eta')
  if (error) throw new Error('No se pudo leer laboratorio: ' + error.message)
  const porEstado: Record<string, any[]> = { en_proceso: [], listo: [], entregado: [] }
  for (const o of data || []) {
    const lista = porEstado[o.status] || (porEstado[o.status] = [])
    lista.push({ paciente: o.patient_name, tipo: o.type, laboratorio: o.lab, fecha_estimada: o.eta })
  }
  return porEstado
}

async function consultaSQL(supabase: any, sql: string) {
  if (!sql || typeof sql !== 'string') throw new Error('Falta la consulta SQL.')
  // La funcion de Postgres valida (solo SELECT, sin escrituras, tablas permitidas)
  // y aplica el RLS del que pregunta -- ver migracion asistente_datos_consulta_solo_lectura.
  const { data, error } = await supabase.rpc('ejecutar_consulta_solo_lectura', { consulta: sql })
  if (error) throw new Error('No se pudo ejecutar la consulta: ' + error.message)
  if (data?.error) throw new Error(data.error)
  return data
}

const HERRAMIENTAS = [
  {
    type: 'function', name: 'resumen_financiero',
    description: 'Devuelve lo facturado, cobrado, pendiente de cobro y gastos de un mes de la clínica.',
    parameters: {
      type: 'object',
      properties: { mes: { type: 'string', description: 'Mes en formato YYYY-MM. Si se omite, se usa el mes actual.' } },
      required: [],
    },
  },
  {
    type: 'function', name: 'pacientes_con_saldo_pendiente',
    description: 'Lista los pacientes que todavía deben dinero por tratamientos, ordenados de mayor a menor deuda.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function', name: 'citas_proximas',
    description: 'Lista las citas agendadas en los próximos días.',
    parameters: {
      type: 'object',
      properties: { dias: { type: 'number', description: 'Cuántos días hacia adelante mirar. Por defecto 7.' } },
      required: [],
    },
  },
  {
    type: 'function', name: 'buscar_paciente',
    description: 'Busca un paciente por nombre o número de documento.',
    parameters: {
      type: 'object',
      properties: { texto: { type: 'string', description: 'Nombre o parte del nombre, o número de documento.' } },
      required: ['texto'],
    },
  },
  {
    type: 'function', name: 'resumen_laboratorio',
    description: 'Lista las órdenes de laboratorio agrupadas por estado (en proceso, listo, entregado).',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function', name: 'consulta_sql',
    description: `Ejecuta una consulta SELECT de solo lectura contra la base de datos de la clínica,
para cualquier pregunta que las otras herramientas no cubran. Solo puede leer (nunca escribir),
solo sobre estas tablas y columnas:

- pacientes(id, name, doc, phone, treatment, age, tag, reason, "birthDate", fecha, hora_cita, sexo,
  direccion, email, allergies, blood, tipo_doc, num_hc, fuente_captacion, linea_negocio, ocupacion)
- historias(id, patient_id, odontograma, plan_tratamiento, evolucion, anamnesis, recetas, periodontal)
  -- plan_tratamiento es un jsonb: arreglo de items con {date, cost, paid, ...}
- ortodoncia(id, paciente_id, examen_clinico, plan_trabajo, plan_tratamiento, resumen)
- laboratorio_ordenes(id, patient_id, patient_name, type, tooth, lab, cost, sent, eta, status)
- gastos(id, categoria, monto, fecha, nota)

Reglas: una sola sentencia SELECT (sin ";"), sin CTEs (nada de "with"), sin funciones de escritura
ni de sistema. El resultado se limita automáticamente a 200 filas. El aislamiento por clínica se
aplica solo (no hace falta filtrar por clínica en el SQL).`,
    parameters: {
      type: 'object',
      properties: { sql: { type: 'string', description: 'La consulta SELECT a ejecutar.' } },
      required: ['sql'],
    },
  },
]

async function ejecutarHerramienta(nombre: string, args: any, supabase: any) {
  switch (nombre) {
    case 'resumen_financiero': return await resumenFinanciero(supabase, args?.mes)
    case 'pacientes_con_saldo_pendiente': return await pacientesConSaldoPendiente(supabase)
    case 'citas_proximas': return await citasProximas(supabase, args?.dias)
    case 'buscar_paciente': return await buscarPaciente(supabase, args?.texto)
    case 'resumen_laboratorio': return await resumenLaboratorio(supabase)
    case 'consulta_sql': return await consultaSQL(supabase, args?.sql)
    default: return { error: 'Herramienta no reconocida: ' + nombre }
  }
}

function construirSystemPrompt() {
  const hoy = new Date().toISOString().slice(0, 10)
  return `Eres el asistente de datos interno de DentalOS. Le respondes al doctor o
administrador del consultorio (nunca a pacientes) preguntas sobre SU PROPIA clínica:
finanzas, pacientes, citas y laboratorio.

Hoy es ${hoy} (formato YYYY-MM-DD). Cuando te pregunten por "este mes", "esta semana",
"hoy" u otra referencia relativa, resuélvela vos mismo usando esta fecha — no le pidas
al usuario que te aclare la fecha, y no dudes del resultado de la herramienta si te
devuelve el mes que corresponde.

Reglas:
- Usa siempre las herramientas disponibles para obtener datos reales; nunca inventes cifras.
- Para preguntas frecuentes (facturación del mes, saldos pendientes, próximas citas, buscar un
  paciente, estado de laboratorio) usa la herramienta específica correspondiente.
- Para cualquier otra pregunta sobre pacientes, historias, ortodoncia, laboratorio o gastos que
  las herramientas específicas no cubran, usa "consulta_sql" armando un SELECT sobre esas tablas.
- Responde en español, breve y directo, con los números relevantes.
- Si la pregunta no tiene nada que ver con los datos de la clínica (ni con las herramientas
  específicas ni con consulta_sql), dilo con honestidad.
- Los montos son en soles (S/).`
}

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

    // Ligado al JWT de quien pregunta: cada herramienta hereda su RLS.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ error: 'No autenticado.' }, 401, corsHeaders)

    const { history, message } = await req.json()
    if (!message || typeof message !== 'string') {
      return json({ error: 'Falta el mensaje.' }, 400, corsHeaders)
    }

    const input: any[] = [
      { role: 'system', content: construirSystemPrompt() },
      ...((Array.isArray(history) ? history : []).map((h: { from: string; txt: string }) => ({
        role: h.from === 'bot' ? 'assistant' : 'user',
        content: h.txt,
      }))),
      { role: 'user', content: message },
    ]

    const llamarOpenAI = async () => {
      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({ model: MODEL, input, tools: HERRAMIENTAS }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || 'OpenAI rechazó la solicitud.')
      return data
    }

    let respuesta = await llamarOpenAI()

    // Hasta 5 vueltas de tool-calling antes de forzar una respuesta de texto,
    // para no quedar en un bucle infinito ante una falla del modelo.
    for (let vuelta = 0; vuelta < 5; vuelta++) {
      const llamadas = (respuesta.output || []).filter((o: any) => o.type === 'function_call')
      if (llamadas.length === 0) break

      for (const llamada of llamadas) {
        let args: any = {}
        try { args = JSON.parse(llamada.arguments || '{}') } catch { /* args inválidos: se usa {} */ }
        let resultado: any
        try {
          resultado = await ejecutarHerramienta(llamada.name, args, supabase)
        } catch (err) {
          // Se le pasa el error real al modelo como resultado de la herramienta,
          // en vez de reventar toda la solicitud: así puede explicarle al usuario
          // qué falló en vez de inventar una excusa genérica.
          resultado = { error: err instanceof Error ? err.message : 'Error al ejecutar la herramienta.' }
        }
        input.push(llamada)
        input.push({ type: 'function_call_output', call_id: llamada.call_id, output: JSON.stringify(resultado) })
      }

      respuesta = await llamarOpenAI()
    }

    const mensaje = (respuesta.output || []).find((o: any) => o.type === 'message')
    const texto = mensaje?.content?.find((c: any) => c.type === 'output_text')?.text
      || mensaje?.content?.[0]?.text
      || 'No pude generar una respuesta, intenta de nuevo.'

    return json({ reply: texto }, 200, corsHeaders)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Error desconocido' }, 400, corsHeaders)
  }
})
