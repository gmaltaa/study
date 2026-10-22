-- ───────────────────────────────────────────────────────────────────────────
-- 002 — Conteúdo externo nas aulas: vídeos, podcasts, imagens e leituras
-- ───────────────────────────────────────────────────────────────────────────
-- Rode no SQL editor do Supabase ANTES de subir o backend que usa estas
-- tabelas. Idempotente.
--
-- O conteúdo NÃO é copiado: guardamos só os metadados públicos (título, autor,
-- duração, miniatura, licença) e o endereço. O vídeo toca no player do
-- YouTube, o podcast toca do endereço do próprio programa e a imagem aparece
-- com o crédito que a licença exige.
--
--  - media_items: cada conteúdo encontrado, UMA vez, compartilhado entre todos
--    os usuários (o mesmo vídeo serve a quem estuda o mesmo assunto).
--  - lesson_media: qual conteúdo foi escolhido para qual aula de qual pessoa,
--    em que papel, e se ajudou.
--  - media_searches: cache das buscas, também compartilhado. Economiza a cota
--    do YouTube (cada busca custa 100 das 10.000 unidades do dia).
--  - api_usage: unidades gastas por dia em cada API com cota.

create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('youtube', 'wikipedia', 'itunes')),
  kind text not null check (kind in ('video', 'image', 'podcast', 'article')),
  external_id text not null,
  title text not null,
  -- Canal, autor da imagem, programa do podcast.
  author text,
  -- Página para abrir fora do app.
  url text not null,
  -- O que o app toca ou mostra: id do vídeo, endereço do áudio, imagem.
  media_url text,
  thumbnail_url text,
  duration_sec int,
  width int,
  height int,
  -- 'pt', 'en'... decidido na seleção quando a fonte não informa.
  language text,
  license text,
  attribution text,
  description text,
  published_at timestamptz,
  status text not null default 'active' check (status in ('active', 'unavailable')),
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, external_id)
);
create index if not exists media_items_refresh_idx on public.media_items (provider, checked_at);

create table if not exists public.lesson_media (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  media_item_id uuid not null references public.media_items(id) on delete cascade,
  -- core: vídeo principal, conta no tempo da aula.
  -- inline: imagem no meio do texto.
  -- extra: "Para ir além", opcional, fora do tempo da aula.
  role text not null check (role in ('core', 'inline', 'extra')),
  position int not null default 0,
  -- Referência usada nos blocos da aula ({ type: 'media', text: 'img1' }).
  ref text,
  caption text,
  -- Por que este conteúdo ajuda nesta aula (escrito pela IA, mostrado ao usuário).
  reason text,
  -- Minutos que este conteúdo ocupa no tempo da aula (só o `core`).
  counts_minutes int not null default 0,
  feedback text check (feedback in ('helpful', 'not_helpful')),
  feedback_at timestamptz,
  created_at timestamptz not null default now(),
  unique (lesson_id, media_item_id)
);
create index if not exists lesson_media_lesson_idx on public.lesson_media (lesson_id, position);
create index if not exists lesson_media_user_idx on public.lesson_media (user_id);

create table if not exists public.media_searches (
  provider text not null,
  query_key text not null,
  item_ids uuid[] not null default '{}',
  fetched_at timestamptz not null default now(),
  primary key (provider, query_key)
);

create table if not exists public.api_usage (
  day date not null,
  provider text not null,
  units int not null default 0,
  primary key (day, provider)
);

-- Reserva unidades de uma API com cota diária. Atômica: duas gerações ao mesmo
-- tempo não passam juntas do teto. Devolve false quando não cabe mais.
create or replace function public.reserve_api_units(p_provider text, p_units int, p_limit int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_units int;
begin
  insert into public.api_usage (day, provider, units)
  values (current_date, p_provider, 0)
  on conflict (day, provider) do nothing;

  update public.api_usage
     set units = units + p_units
   where day = current_date and provider = p_provider and units + p_units <= p_limit
  returning units into v_units;

  return v_units is not null;
end $$;

revoke execute on function public.reserve_api_units(text, int, int) from public, anon, authenticated;

-- A seleção de mídia é uma etapa nova da IA.
alter table public.generation_jobs drop constraint if exists generation_jobs_kind_check;
alter table public.generation_jobs add constraint generation_jobs_kind_check
  check (kind in ('topic_profile', 'path_modules', 'module_lessons', 'lesson_content', 'accuracy_review', 'media_selection'));

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.media_items enable row level security;
alter table public.lesson_media enable row level security;
alter table public.media_searches enable row level security;
alter table public.api_usage enable row level security;

-- Metadados públicos de conteúdo público: qualquer usuário logado lê.
drop policy if exists media_items_select on public.media_items;
create policy media_items_select on public.media_items for select to authenticated using (true);

-- O usuário lê os da sua aula e marca se ajudou. Quem escreve é o backend.
drop policy if exists lesson_media_select on public.lesson_media;
create policy lesson_media_select on public.lesson_media for select using (user_id = auth.uid());
drop policy if exists lesson_media_update on public.lesson_media;
create policy lesson_media_update on public.lesson_media for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- media_searches e api_usage: sem policy. Só a service role.
