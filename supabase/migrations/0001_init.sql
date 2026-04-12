-- TickerSense initial schema (Postgres / Supabase)
-- Optional future: enable pgvector for RAG-style chat memory.

create extension if not exists "uuid-ossp";

create table if not exists public.companies (
  id uuid primary key default uuid_generate_v4(),
  ticker text not null unique,
  cik text,
  name text,
  exchange text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.filings (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete cascade,
  form text not null,
  filed_at date not null,
  accession_number text not null,
  primary_document text,
  filing_url text,
  raw_metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists filings_company_id_filed_at_idx on public.filings (company_id, filed_at desc);

create table if not exists public.filing_sections (
  id uuid primary key default uuid_generate_v4(),
  filing_id uuid references public.filings (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  section_key text not null,
  label text not null,
  excerpt text,
  source_url text,
  created_at timestamptz not null default now()
);

create index if not exists filing_sections_company_id_idx on public.filing_sections (company_id);

create table if not exists public.market_snapshots (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete cascade,
  as_of timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists market_snapshots_company_id_as_of_idx
  on public.market_snapshots (company_id, as_of desc);

create table if not exists public.chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references public.companies (id) on delete set null,
  ticker text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_id_created_at_idx
  on public.chat_messages (session_id, created_at asc);

-- Future-friendly comment (no-op if unused):
-- alter table public.chat_messages add column if not exists embedding vector(1536);
