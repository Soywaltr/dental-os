# SQL para crear las tablas nuevas

Ejecuta esto en el **SQL Editor** de Supabase (ajusta el tipo de `patient_id` si `pacientes.id` no es `bigint` — debe coincidir con el mismo tipo que ya usa `historias.patient_id`).

```sql
-- Tabla: laboratorio_ordenes
create table public.laboratorio_ordenes (
  id bigint generated always as identity primary key,
  patient_id bigint not null references public.pacientes(id),
  patient_name text,
  type text not null,
  tooth text,
  lab text not null,
  cost numeric default 0,
  sent date,
  eta date,
  status text default 'en_proceso',
  created_at timestamptz default now()
);

alter table public.laboratorio_ordenes enable row level security;

create policy "allow all for authenticated"
  on public.laboratorio_ordenes
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Tabla: gastos
create table public.gastos (
  id bigint generated always as identity primary key,
  categoria text not null,
  monto numeric not null default 0,
  fecha date not null,
  nota text,
  created_at timestamptz default now()
);

alter table public.gastos enable row level security;

create policy "allow all for authenticated"
  on public.gastos
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
```

Las políticas de arriba asumen que tu app ya opera con usuarios autenticados (como el resto de tablas). Si tus otras tablas (`pacientes`, `historias`) usan una política RLS distinta, replica esa misma política aquí en vez de la de ejemplo.
