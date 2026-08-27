-- LUMINA: banco de modelos e votos.
-- Pode ser executado novamente sem apagar dados existentes.

create table if not exists public.models (
  id text primary key,
  name text not null,
  city text not null,
  bio text not null,
  images jsonb not null default '[]'::jsonb,
  base_votes integer not null default 0 check (base_votes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id bigint generated always as identity primary key,
  model_id text not null references public.models(id) on delete cascade,
  voter_hash text not null,
  created_at timestamptz not null default now(),
  constraint votes_one_per_person unique (voter_hash)
);

create index if not exists votes_model_id_idx on public.votes(model_id);
alter table public.models enable row level security;
alter table public.votes enable row level security;

-- O site acessa as tabelas somente pelo servidor com a Secret key.
-- Nenhuma política pública de escrita é criada.
create or replace view public.model_vote_totals
with (security_invoker = true)
as
select
  m.id, m.name, m.city, m.bio, m.images, m.created_at,
  (m.base_votes + count(v.id))::integer as votes
from public.models m
left join public.votes v on v.model_id = m.id
group by m.id;

-- As modelos são cadastradas exclusivamente pelo painel administrativo.
