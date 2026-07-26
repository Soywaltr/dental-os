# SQL y configuración para Ajustes → Integraciones

## 1. Tabla nueva en Supabase (SQL Editor)

```sql
create table public.integraciones_whatsapp (
  id bigint generated always as identity primary key,
  access_token text,
  businesses jsonb default '[]'::jsonb,
  connected_at timestamptz,
  updated_at timestamptz default now()
);

alter table public.integraciones_whatsapp enable row level security;

create policy "allow all for authenticated" on public.integraciones_whatsapp
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

## 2. Google Calendar — ya funciona, sin pasos adicionales

Reutiliza el mismo `CLIENT_ID` y flujo OAuth que ya existía en Agenda (ahora
centralizado en `src/utils/useGoogleCalendar.js`). El botón "Conectar con
Google" en Ajustes → Integraciones usa el mismo token que Agenda — conectar
o desconectar desde cualquiera de los dos lugares afecta al otro.

## 3. WhatsApp Business (Meta) — requiere configuración externa

Esto **no funcionará hasta que completes estos pasos** en
[developers.facebook.com](https://developers.facebook.com):

1. Crea (o usa) una app de Meta for Developers y agrégale el producto
   **WhatsApp**.
2. En **Configuración básica** de la app, copia el **App ID** y reemplázalo
   en `src/utils/constants.js`:
   ```js
   export const META_APP_ID = "TU_META_APP_ID_AQUI"; // <- reemplazar
   ```
3. En **Facebook Login for Business** (o en la config de OAuth de la app),
   agrega como **Redirect URI válida** exactamente:
   ```
   https://drasolvargas.com/
   ```
   (el origin + path desde donde se abre la app; si la app vive en otra
   ruta, ajusta el valor).
4. En Supabase (Project Settings → Edge Functions → Secrets), configura:
   ```sh
   supabase secrets set META_APP_ID=tu_app_id
   supabase secrets set META_APP_SECRET=tu_app_secret
   ```
5. Despliega la función de intercambio de código:
   ```sh
   supabase functions deploy whatsapp-meta-callback
   ```
6. Verifica en **Revisión de la app** de Meta que los permisos
   `whatsapp_business_management` y `whatsapp_business_messaging` estén
   aprobados (o que tu app esté en modo desarrollo con tu propia cuenta como
   tester) — sin esto, Meta rechaza el consentimiento aunque el App ID sea
   correcto.

Una vez completado esto, el botón "Conectar con Meta" en Ajustes →
Integraciones abre el diálogo real de Meta, intercambia el código por un
token, y guarda la conexión en `integraciones_whatsapp`. El siguiente paso
(seleccionar el número de WhatsApp Business específico dentro del negocio
conectado) se termina de ajustar una vez haya credenciales reales para
probar contra la API — la forma exacta de listar los números depende de si
tu app usa Embedded Signup o permisos manuales.
