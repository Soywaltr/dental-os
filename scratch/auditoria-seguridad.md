# Auditoría de seguridad — 25/07/2026

App multi-tenant con datos de salud (React + Vite + Supabase). 16 hallazgos,
14 corregidos. Commits: `866fcd3`, `9946af8`, `d5053d4`, `1a58605`.

## Adenda — 27/07/2026: MFA para usuarios de la app + incidente de producción

Plan aparte (bloque propio, no parte de los 16 hallazgos originales): MFA obligatorio
para todos los roles con patrón incremental (`as restrictive`, nadie bloqueado hasta
que enrole su propio factor). Sin códigos de respaldo — Supabase no los ofrece
("Supabase does not return recovery codes"); la recuperación se apoya en 2
dispositivos + reset por admin de la misma clínica (Fase 4, pendiente) + break-glass
del dashboard (el dueño del proyecto borra el factor desde Authentication → Users).

**Fase 1** (`fe63c4b`): `Ajustes → Seguridad` — enrolar/listar/quitar factores TOTP.
**Fase 2** (`d4e452c`): `MFAChallenge.jsx` + gate en `App.jsx` (después del login, no
lo toca). Corregida una condición de carrera real en `useAAL()` antes de commitear:
sin ella, un frame entre el login y el recálculo del AAL dejaba pasar el árbol
completo de la app. **Checkpoint del usuario confirmado en vivo antes de la Fase 3.**

**Fase 3 — incidente real, corregido en la misma sesión.** Las 8 políticas
`as restrictive` (patrón oficial de Supabase para exigir aal2 solo a quien ya tiene
un factor verificado) consultan `auth.mfa_factors` en la subconsulta. Al aplicarlas,
**el rol `authenticated` no tenía `GRANT SELECT` sobre esa tabla en este proyecto** —
un error de permiso en una política rompe la consulta completa (no se evalúa como
"false"), así que las 8 tablas + `storage.objects` quedaron **inaccesibles para
cualquier usuario autenticado, en producción**, hasta el rollback.

Secuencia real: aplicar → error detectado al verificar (`permission denied for
table mfa_factors`) → rollback inmediato de las 8 políticas → verificado que el
acceso normal volvió (conteos reales de `pacientes`/`historias`/etc.) → corregida
la causa raíz → **verificado el fix aislado antes de reintentar** → reaplicadas las
8 políticas → verificado aal1 (bloqueado) vs aal2 (normal) para el usuario real, que
ya tiene MFA verificado → verificado que un usuario sin ningún factor sigue
funcionando en aal1 (rama "grandfather" del patrón incremental).

Causa raíz corregida:
```sql
grant select on auth.mfa_factors to authenticated;

create policy "usuarios ven sus propios factores mfa" on auth.mfa_factors
  for select to authenticated
  using (user_id = auth.uid());
```
`auth.mfa_factors` tiene RLS activado sin ninguna policy propia — el `GRANT` solo no
alcanzaba, porque sin una policy el RLS deniega todo a quien no sea el dueño de la
tabla. La policy nueva es estrictamente auto-limitada (`user_id = auth.uid()`):
ningún usuario puede ver los factores de otro con esto.

**Lección para la próxima vez que se agregue una política que consulte una tabla
fuera de `public`:** simular el `USING` de la política de forma aislada (como se
hizo después, no antes) contra el usuario real, **antes** de aplicarla sobre las
tablas de negocio — habría detectado este error de permisos sin pasar por
producción en absoluto.

Estado tras la corrección: Fase 3 aplicada y verificada. Domain afectado —
`pacientes`, `historias`, `ortodoncia`, `laboratorio_ordenes`, `gastos`,
`integraciones_google`, `integraciones_whatsapp`, `storage.objects` (bucket
`imagenes`). `clinicas` y `usuarios_clinica` quedan fuera a propósito (sin
restricción de aal2), porque hacen falta en aal1 para que la propia pantalla del
challenge tenga contexto.

**Fase 4** (`36e78f2`): Edge Function `mfa-admin-reset` desplegada — reset del
segundo factor de otro usuario de la misma clínica, con 5 controles server-side
(identidad desde el JWT, `rol = 'admin'`, el propio llamante en `aal2`, mismo
`clinica_id` que el objetivo, no auto-reset). `usuarios_clinica.rol` se hila por
primera vez desde `useClinic()` hasta las vistas — existía en la tabla, nada lo
usaba. UI en `Ajustes → Seguridad` (`GestionMFA`, solo visible si `rol==='admin'`).

Con esto, las 4 fases del plan de MFA quedan completas y desplegadas:
enrolamiento → challenge en el login → RLS aal2 incremental → reset por admin.

**Endurecido a `aal2` estricto** (migración `mfa_rls_aal2_estricto`, aplicada
directo en Supabase — sin cambios de código, no requirió commit). Se quitó la
rama de gracia de las 8 políticas: ya no aceptan `aal1` para nadie, tengan o no
un factor MFA. Verificada la precondición antes de aplicar —
`select u.email, count(f.id) filter (where f.status='verified') from auth.users u left join auth.mfa_factors f on f.user_id=u.id group by u.id, u.email`
— un solo usuario en todo el sistema, con 1 factor verificado (cobertura 100%).
Verificado después: usuario real en aal1 → bloqueado (igual que antes); en aal2
→ normal; usuario simulado **sin ningún factor** en aal1 → ahora bloqueado
también (esto sí cambió respecto al modo incremental, es el efecto esperado).

**Consecuencia permanente a tener presente:** cualquier usuario nuevo que se
agregue a `usuarios_clinica` de aquí en adelante (personal nuevo, o una
clínica B) va a ver el Dashboard vacío/roto hasta que enrole su propio factor
en Ajustes → Seguridad — ya no hay periodo de gracia. Vale la pena avisarle a
cualquier persona nueva que lo primero que tiene que hacer al entrar es
configurar la verificación en dos pasos, antes de que note que "no ve nada".

**Riesgo con el que queda la única cuenta admin:** tiene un solo dispositivo
enrolado (el propio Ajustes → Seguridad se lo recomendó agregar un segundo,
todavía no lo hizo). Si lo pierde, el reset por admin (Fase 4) no le sirve a
ella misma — necesitaría el break-glass del dashboard de Supabase. Vale la
pena que agregue el segundo dispositivo ahora que el modo estricto ya no
tiene red de respaldo alternativa.

**Revertido a incremental** (migración `mfa_rls_aal2_revertir_a_incremental`,
mismo día). Motivo: al dar de alta la primera clínica adicional (Vitadent), el
usuario pidió explícitamente que una cuenta nueva pueda entrar con solo
correo+contraseña y usar la app con normalidad, con el MFA como algo opcional
que cada quien activa o desactiva desde Ajustes → Seguridad (el
enroll/unenroll ya existía) — no obligatorio desde el primer login. Confirmado
explícitamente antes de aplicar, porque revertía una decisión de endurecimiento
tomada momentos antes en la misma sesión.

Vuelve exactamente al patrón de `mfa_rls_aal2_incremental_v2`: aal2 exigido
solo a quien ya tiene un factor verificado; sin factor, aal1 alcanza. Verificado
después: usuario real (con factor) en aal1 → sigue bloqueado; en aal2 → normal
(11 pacientes). La condición de la política probada de forma aislada para un
usuario sin ningún factor → `true` (pasa). *Nota del propio proceso: la primera
verificación de este caso se hizo por error contra `pacientes` con un
`user_id` que no existe en `usuarios_clinica`, dando un falso "bloqueado" — el
motivo real era `clinic_isolation` (no pertenece a ninguna clínica), no el MFA.
Corregido probando la condición de la política aal2 aislada, sin arrastrar esa
variable.*

**Estado final (vigente):** MFA opcional/incremental en las 8 tablas +
`storage.objects`. Sigue pendiente, sin decidir todavía, si en algún momento se
vuelve a endurecer (por ejemplo cuando haya más de una clínica y más de un
usuario activo) — evaluarlo de nuevo en ese momento, con la misma cautela.

**Deuda anotada (fuera de alcance de este bloque, explícita por el usuario):**
control de acceso por rol — hoy `rol` no restringe ninguna lectura de PHI;
recepción ve exactamente las mismas historias clínicas que un admin/doctor.

## Corregido

| # | Sev | Hallazgo | Corrección | Verificación |
|---|-----|----------|-----------|--------------|
| C-1 | Crítico | Bucket `imagenes` con 4 políticas para el rol `public` y condición `true`: cualquiera en internet podía listar, subir, sobrescribir y **borrar** radiografías y la firma digital | Políticas reemplazadas por acceso solo autenticado | Listado anónimo: 11 archivos → `[]`. Borrado anónimo de la firma: HTTP 400. Los 11 archivos intactos |
| C-2 | Crítico | Rutas de Storage sin `clinica_id`. `perfil-doctor.png` y `firma-doctor.png` eran rutas fijas **globales**: con dos clínicas se sobrescribían entre sí, y eran nombres adivinables | Todas las rutas llevan el UUID de la clínica como primer segmento (`utils/storage.js`) + política `imagenes_aislamiento_por_clinica` | `storage.foldername()[1]` validado contra `usuarios_clinica` |
| C-2b | Crítico | Bucket `public = true`: Supabase sirve las URLs públicas **sin pasar por RLS**, así que quien tuviera la ruta descargaba el archivo | Bucket privado + `createSignedUrl` en todos los puntos de lectura | URL fresca (sin CDN): 200 → **400** en firma, radiografía y logo |
| A-1 | Alto | PAT de Supabase expuesto en una captura | Rotado por el usuario | — |
| A-2 | Alto | `create-culqi-link` con la llave de Culqi en el código (placeholder, pero repo público y función desplegada). `amount` sin validar | `Deno.env.get` + validación de `amount`/`description` | Desplegada v3 |
| A-4 | Alto | XSS almacenado: `Consentimientos.jsx` interpolaba nombre y DNI del paciente sin escapar en `document.write` | `esc()` aplicado a todos los campos | — |
| A-5 | Alto | PHI residual: el logout no borraba odontogramas ni lista de pacientes de `localStorage` **ni de la memoria de React** | Borrado de claves + recarga completa; también al detectar otro `user_id` | — |
| A-6 | Alto | `ws` con vulnerabilidad alta en dependencias de producción | `npm audit fix` | **Producción: 0 vulnerabilidades** |
| M-1 | Medio | `google-calendar-token` recibía el `refresh_token` del navegador: cualquier usuario autenticado podía hacerle canjear tokens arbitrarios con nuestro client secret | Deduce la clínica del JWT y lee el token de la base con el RLS del usuario | Sin sesión: HTTP 401 |
| M-2 | Medio | CORS `*` en las 4 Edge Functions | Allowlist de orígenes | Origen no permitido recibe `drasolvargas.com` |
| M-5 | Medio | `vite`/`postcss` vulnerables (solo desarrollo) | Actualizados | — |
| B-1 | Bajo | Tablas visibles en el esquema GraphQL para `anon` | `revoke select ... from anon` | `anon` pasa de `[]` a `permission denied` |
| B-2 | Bajo | `esc()` no escapaba `&` ni comillas, y `firmaDoctorUrl` se interpola en `src="..."` | Escape completo | — |
| B-3 | Bajo | `chat-ia` sin commitear | En control de versiones | — |

### Bugs latentes encontrados de paso

- **Borrado silencioso**: los borrados usaban `url.split('/').pop()`, que devuelve
  solo el último segmento. Con rutas anidadas el borrado habría fallado sin avisar,
  dejando radiografías huérfanas. Resuelto con `rutaDesdeUrl()`.
- **Fotos de ortodoncia rotas**: `handleUploadFotoOrto` y `handleDeleteFotoOrto` se
  llamaban desde el JSX pero nunca se implementaron — `ReferenceError` al hacer clic.
- **`clinicaId` nulo tras re-login**: `useClinic()` no escuchaba `onAuthStateChange`,
  así que tras cerrar y volver a iniciar sesión sin recargar, todo insert habría
  fallado (`clinica_id` es `NOT NULL`).

## Riesgos aceptados

- **A-3 · Sin MFA en el login de DentalOS.** `auth.mfa_factors` = 0. Habilitar TOTP en
  el dashboard solo lo permite; falta la pantalla de enrolamiento en la app.
  El MFA configurado protege la **cuenta de Supabase** (que se salta RLS, o sea el
  activo más crítico), no el login de la app.
- **A-3 · Leaked password protection desactivada.** Requiere plan Pro. Mitigado con
  una contraseña más larga.
- **M-3 · Tokens OAuth en texto plano** (`integraciones_google`,
  `integraciones_whatsapp`). El RLS los protege, pero quedan legibles con la
  service_role key o en un backup. Pendiente: Supabase Vault.
- **Dev: `brace-expansion` (DoS)** dentro de la cadena de ESLint. `--force` rompería
  ESLint y el riesgo es nulo (globs propios). Se resuelve solo al actualizar ESLint.

## Deuda pendiente

**Política transitoria a eliminar.** Los 11 archivos subidos antes de C-2 viven en
la raíz del bucket. `storage.foldername()` devuelve `[]` para ellos, así que la
política de aislamiento los dejaba visibles pero imposibles de borrar desde la app.
Se agregó `imagenes_legado_raiz_transitoria` (`with_check false`: permite leer y
borrar lo viejo, prohíbe crear nuevos en la raíz).

Al mover esos archivos a `{clinica_id}/...`, verificar y eliminar:

```sql
-- Debe devolver 0 antes de continuar
select count(*) from storage.objects
 where bucket_id='imagenes' and array_length(storage.foldername(name),1) is null;

drop policy "imagenes_legado_raiz_transitoria" on storage.objects;
```

No hace falta migrar `historias.imagenes` ni `ortodoncia.fotografias`:
`rutaDesdeUrl()` acepta tanto las URLs públicas antiguas como las rutas nuevas.

## Confirmado correcto

- RLS con filtro real por `clinica_id` (`USING` **y** `WITH CHECK`) en las 8 tablas
  de negocio. Ninguna política del tipo `auth.role() = 'authenticated'` sin filtro.
- Ninguna tabla con RLS deshabilitado.
- `usuarios_clinica` solo con política de SELECT: nadie puede auto-asignarse a otra
  clínica desde el cliente.
- El cliente usa la clave publicable, no la service_role.
- Historial de git sin service_role, PAT ni client secrets.
- `.mcp.json` ignorado y sin trackear; no existe `.env`.
- `GOOGLE_CLIENT_SECRET` solo del lado servidor.
- Bundle compilado sin secretos (solo el Google Client ID, público por diseño).
- Las 2 Edge Functions desplegadas con `verify_jwt: true`.
