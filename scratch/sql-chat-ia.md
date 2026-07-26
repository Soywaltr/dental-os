# SQL y despliegue para Chat IA

## 1. Tabla nueva en Supabase (SQL Editor)

```sql
create table public.chat_conversaciones (
  id bigint generated always as identity primary key,
  name text not null,
  phone text,
  thread jsonb not null default '[]'::jsonb,
  unread int not null default 0,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.chat_conversaciones enable row level security;

create policy "allow all for authenticated" on public.chat_conversaciones
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

## 2. Desplegar el Edge Function y configurar la API key

Desde tu terminal, con la Supabase CLI instalada y logueada en tu proyecto:

```sh
supabase functions deploy chat-ia
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

Sin el secreto `ANTHROPIC_API_KEY` configurado, el chat va a responder con el mensaje de error de conexión en vez de la respuesta de Nanda.
