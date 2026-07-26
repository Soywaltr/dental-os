# Auditoría de seguridad — 25/07/2026

App multi-tenant con datos de salud (React + Vite + Supabase). 16 hallazgos,
14 corregidos. Commits: `866fcd3`, `9946af8`, `d5053d4`, `1a58605`.

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
