import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Fase 4 del plan de MFA: reset del segundo factor de OTRO usuario, para el
// caso -- que en una clinica va a pasar -- de alguien que pierde su unico
// dispositivo. Supabase no ofrece codigos de respaldo, asi que esta funcion es
// una de las tres vias de recuperacion (la otra es que el propio dueno del
// proyecto borre el factor desde Authentication > Users en el dashboard).
//
// admin.mfa.deleteFactor exige service_role, por eso esto vive en una Edge
// Function y no en el cliente. Cinco controles, todos del lado del servidor:
//  1. La identidad de quien llama sale de su JWT, nunca del body.
//  2. Quien llama debe ser 'admin' en usuarios_clinica.
//  3. Quien llama debe estar EL MISMO en aal2 -- si no, quien solo robara la
//     contrasena del admin podria entrar en aal1 y desactivar el MFA de todos.
//  4. El objetivo debe compartir clinica_id con quien llama. Como esta
//     consulta corre con service_role (no pasa por RLS), el filtro se escribe
//     explicito aqui -- es lo que evita que un admin de la clinica A vea o
//     resetee a alguien de la clinica B.
//  5. El objetivo no puede ser uno mismo (evita el mismo bypass del punto 3).

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

// Decodifica el payload de un JWT que el runtime ya verifico (verify_jwt: true
// en esta funcion) -- no hace falta volver a verificar la firma aqui.
function leerAal(authHeader: string): string | null {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.aal ?? null
  } catch {
    return null
  }
}

serve(async (req: Request) => {
  const corsHeaders = corsFor(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader) return json({ error: 'Falta el encabezado Authorization.' }, 401, corsHeaders)

    // Ligado al JWT de quien llama: solo puede ver su propia fila en
    // usuarios_clinica (asi esta la RLS), que es exactamente lo que hace falta
    // para saber quien es y a que clinica pertenece.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await callerClient.auth.getUser()
    if (userError || !user) return json({ error: 'No autenticado.' }, 401, corsHeaders)

    // Control 3: quien llama debe estar el mismo en aal2.
    if (leerAal(authHeader) !== 'aal2') {
      return json({ error: 'Completa tu propia verificación en dos pasos antes de gestionar la de otros.' }, 403, corsHeaders)
    }

    const { data: miMembresia, error: miMembresiaError } = await callerClient
      .from('usuarios_clinica').select('clinica_id, rol').eq('user_id', user.id).limit(1)
    if (miMembresiaError) throw miMembresiaError
    const yo = miMembresia?.[0]

    // Control 2: quien llama debe ser admin.
    if (!yo || yo.rol !== 'admin') {
      return json({ error: 'Solo un administrador de la clínica puede hacer esto.' }, 403, corsHeaders)
    }

    // service_role: hace falta para leer la membresia de OTROS usuarios (la
    // policy de usuarios_clinica solo deja ver la fila propia) y para las
    // operaciones de administracion de MFA.
    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { action, targetUserId } = await req.json()

    if (action === 'list') {
      const { data: miembros, error: miembrosError } = await serviceClient
        .from('usuarios_clinica').select('user_id, rol').eq('clinica_id', yo.clinica_id)
      if (miembrosError) throw miembrosError

      const conDetalle = await Promise.all((miembros || []).map(async (m: { user_id: string; rol: string }) => {
        const [{ data: userData }, { data: factoresData }] = await Promise.all([
          serviceClient.auth.admin.getUserById(m.user_id),
          serviceClient.auth.admin.mfa.listFactors({ userId: m.user_id }),
        ])
        return {
          userId: m.user_id,
          email: userData?.user?.email || null,
          rol: m.rol,
          esUnoMismo: m.user_id === user.id,
          factores: (factoresData?.factors || []).map((f: { id: string; friendly_name?: string; status: string; created_at: string }) => ({
            id: f.id, friendlyName: f.friendly_name, status: f.status, createdAt: f.created_at,
          })),
        }
      }))
      return json({ miembros: conDetalle }, 200, corsHeaders)
    }

    if (action === 'reset') {
      if (!targetUserId || typeof targetUserId !== 'string') {
        return json({ error: 'Falta targetUserId.' }, 400, corsHeaders)
      }
      // Control 5: no auto-reset con esta herramienta.
      if (targetUserId === user.id) {
        return json({ error: 'No puedes restablecer tu propio acceso aquí — usa Ajustes → Seguridad.' }, 400, corsHeaders)
      }

      const { data: suMembresia, error: suMembresiaError } = await serviceClient
        .from('usuarios_clinica').select('clinica_id').eq('user_id', targetUserId).limit(1)
      if (suMembresiaError) throw suMembresiaError
      const objetivo = suMembresia?.[0]

      // Control 4: aislamiento multi-tenant.
      if (!objetivo || objetivo.clinica_id !== yo.clinica_id) {
        return json({ error: 'Ese usuario no pertenece a tu clínica.' }, 403, corsHeaders)
      }

      const { data: factoresData, error: listError } = await serviceClient.auth.admin.mfa.listFactors({ userId: targetUserId })
      if (listError) throw listError

      for (const factor of factoresData?.factors || []) {
        const { error: delError } = await serviceClient.auth.admin.mfa.deleteFactor({ id: factor.id, userId: targetUserId })
        if (delError) throw delError
      }

      return json({ ok: true, factoresEliminados: factoresData?.factors?.length || 0 }, 200, corsHeaders)
    }

    return json({ error: 'Acción no reconocida: ' + action }, 400, corsHeaders)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Error desconocido' }, 400, corsHeaders)
  }
})
