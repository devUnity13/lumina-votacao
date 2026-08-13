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

insert into public.models (id, name, city, bio, images, base_votes)
values
  ('maya', 'Maya Alves', 'São Paulo, SP', 'Moda, movimento e uma presença que transforma cada passarela.', '["https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=85","https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85","https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85"]'::jsonb, 0),
  ('isadora', 'Isadora Lima', 'Rio de Janeiro, RJ', 'Autenticidade tropical com uma assinatura editorial inesquecível.', '["/isadora-01.jpg","https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=85","https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=85"]'::jsonb, 0),
  ('helena', 'Helena Costa', 'Belo Horizonte, MG', 'Elegância contemporânea, atitude e uma beleza que fala por si.', '["https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85","https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=900&q=85","https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=85"]'::jsonb, 0)
on conflict (id) do nothing;
