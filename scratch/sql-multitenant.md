# Migración multi-tenant — Fase 1 (fundación)

Verificado contra el esquema real vía MCP de Supabase (solo lectura): columnas exactas
de `pacientes`/`historias`/`ortodoncia`, nombres exactos de las políticas RLS actuales
(`"Permitir todo a usuarios logueados"` en pacientes/historias/ortodoncia, `"allow all
for authenticated"` en laboratorio_ordenes/gastos/integraciones_whatsapp), y el único
usuario existente (`dra.solvargass@gmail.com`). Datos actuales: 1 paciente, 9 historias,
0 ortodoncia, 2 laboratorio_ordenes, 3 gastos, 0 integraciones_whatsapp — dataset chico,
migración de bajo riesgo.

Todo corre dentro de una transacción (`begin`/`commit`): si algo falla a mitad de
camino, Postgres revierte todo, no queda a medias.

```sql
begin;

-- 1) Tabla de clínicas (tenants)
create table public.clinicas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  telefono text,
  email text,
  cop text,
  whatsapp_numero text,
  logo_url text,
  created_at timestamptz default now()
);

-- 2) Tabla puente usuario <-> clínica (permite varios usuarios por clínica a futuro)
create table public.usuarios_clinica (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clinica_id uuid not null references public.clinicas(id) on delete cascade,
  rol text not null default 'admin' check (rol in ('admin','doctor','recepcionista')),
  created_at timestamptz default now(),
  unique (user_id, clinica_id)
);
alter table public.usuarios_clinica enable row level security;
create policy "usuarios ven su propia membresia" on public.usuarios_clinica
  for select to authenticated using (user_id = auth.uid());

-- 3) Nueva tabla: conexión de Google Calendar por clínica (reemplaza localStorage)
create table public.integraciones_google (
  id uuid primary key default gen_random_uuid(),
  clinica_id uuid not null references public.clinicas(id) on delete cascade unique,
  access_token text,
  connected_at timestamptz,
  updated_at timestamptz default now()
);
alter table public.integraciones_google enable row level security;

-- 4) clinica_id en las tablas existentes
alter table public.pacientes add column clinica_id uuid references public.clinicas(id);
alter table public.historias add column clinica_id uuid references public.clinicas(id);
alter table public.ortodoncia add column clinica_id uuid references public.clinicas(id);
alter table public.laboratorio_ordenes add column clinica_id uuid references public.clinicas(id);
alter table public.gastos add column clinica_id uuid references public.clinicas(id);
alter table public.integraciones_whatsapp add column clinica_id uuid references public.clinicas(id);

-- 5) Backfill: una clínica para todo lo existente, vinculada a tu usuario
do $$
declare
  v_clinica_id uuid;
  v_user_id uuid := 'fecdbf00-6504-4980-9660-e7ab26751015'; -- dra.solvargass@gmail.com
begin
  insert into public.clinicas (nombre, direccion, telefono, email, cop, whatsapp_numero)
  values ('Consultorio Dra. Sol Vargas', 'Los Diamantes 178, Trujillo 13011', '+51 915 054 145', 'drasolvargass@gmail.com', '12345', '+51 915 054 145')
  returning id into v_clinica_id;

  insert into public.usuarios_clinica (user_id, clinica_id, rol) values (v_user_id, v_clinica_id, 'admin');

  update public.pacientes set clinica_id = v_clinica_id;
  update public.historias set clinica_id = v_clinica_id;
  update public.ortodoncia set clinica_id = v_clinica_id;
  update public.laboratorio_ordenes set clinica_id = v_clinica_id;
  update public.gastos set clinica_id = v_clinica_id;
  update public.integraciones_whatsapp set clinica_id = v_clinica_id;
end $$;

-- 6) NOT NULL ahora que todo tiene clinica_id
alter table public.pacientes alter column clinica_id set not null;
alter table public.historias alter column clinica_id set not null;
alter table public.ortodoncia alter column clinica_id set not null;
alter table public.laboratorio_ordenes alter column clinica_id set not null;
alter table public.gastos alter column clinica_id set not null;
alter table public.integraciones_whatsapp alter column clinica_id set not null;

-- 7) RLS: reemplazar "permitir todo" por aislamiento por clínica
drop policy "Permitir todo a usuarios logueados" on public.pacientes;
drop policy "Permitir todo a usuarios logueados" on public.historias;
drop policy "Permitir todo a usuarios logueados" on public.ortodoncia;
drop policy "allow all for authenticated" on public.laboratorio_ordenes;
drop policy "allow all for authenticated" on public.gastos;
drop policy "allow all for authenticated" on public.integraciones_whatsapp;

create policy "clinic_isolation" on public.pacientes for all to authenticated
  using (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()))
  with check (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()));

create policy "clinic_isolation" on public.historias for all to authenticated
  using (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()))
  with check (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()));

create policy "clinic_isolation" on public.ortodoncia for all to authenticated
  using (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()))
  with check (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()));

create policy "clinic_isolation" on public.laboratorio_ordenes for all to authenticated
  using (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()))
  with check (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()));

create policy "clinic_isolation" on public.gastos for all to authenticated
  using (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()))
  with check (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()));

create policy "clinic_isolation" on public.integraciones_whatsapp for all to authenticated
  using (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()))
  with check (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()));

create policy "clinic_isolation" on public.integraciones_google for all to authenticated
  using (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()))
  with check (clinica_id in (select clinica_id from public.usuarios_clinica where user_id = auth.uid()));

commit;
```

## Hallazgos de seguridad pre-existentes (no relacionados a multi-tenant, encontrados de paso)

- El bucket `imagenes` es público y permite **listar** todos sus archivos (política de
  SELECT amplia). No es parte de este cambio, pero es una fuga real — cualquiera con la
  anon key podría listar todo el contenido del bucket, no solo acceder por URL directa.
- "Leaked password protection" está desactivada en Auth (Supabase revisa contraseñas
  contra HaveIBeenPwned).

Ninguno de los dos es culpa de la migración ni bloquea seguir — los dejo anotados por si
quieres atenderlos aparte.
