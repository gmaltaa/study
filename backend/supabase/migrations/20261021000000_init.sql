-- ───────────────────────────────────────────────────────────────────────────
-- 001 — Schema inicial
-- ───────────────────────────────────────────────────────────────────────────
-- Rode com `supabase db push` ou cole no SQL editor do Supabase. Projeto novo:
-- este arquivo cria tudo do zero.
--
-- Convenções:
--  - Toda tabela tem `user_id`, mesmo quando dá para chegar ao dono por junção.
--    A RLS fica uma linha só (`user_id = auth.uid()`).
--  - Estados são `text` com CHECK, não enum do Postgres: acrescentar um valor é
--    trocar o CHECK, sem migração de tipo.
--  - O conteúdo gerado pela IA (módulos, aulas, exercícios) só é ESCRITO pelo
--    backend com a service role. O usuário só lê.
--  - O cronograma futuro NÃO é gravado. `study_sessions` guarda só o dia de hoje
--    (congelado na primeira abertura) e o passado. O futuro é calculado em
--    lib/schedule.ts.

-- ─── Perfil ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  timezone text not null default 'America/Sao_Paulo',
  onboarded_at timestamptz,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_study_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cria o perfil junto com o usuário (e-mail, Google ou Apple).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 60), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Tema ──────────────────────────────────────────────────────────────────
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  goal text check (char_length(goal) <= 600),
  level text not null default 'beginner'
    check (level in ('beginner', 'some_knowledge', 'intermediate')),
  depth text not null default 'solid'
    check (depth in ('intro', 'solid', 'deep')),
  -- Preferências de aprendizado: { style: 'theory' | 'balanced' | 'practice' }.
  preferences jsonb not null default '{}'::jsonb,
  icon text not null default '📘',
  color text not null default 'teal',
  status text not null default 'generating'
    check (status in ('generating', 'review', 'active', 'paused', 'completed', 'failed')),
  -- Saída do passo 1 da IA: domínio, sensibilidade factual, aviso.
  topic_profile jsonb,
  active_path_id uuid,
  failure_reason text,
  -- Último dia em que o lembrete saiu (evita mandar duas vezes no mesmo dia).
  reminded_on date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subjects_user_idx on public.subjects (user_id) where archived_at is null;

-- ─── Disponibilidade (versionada: vale a mais recente) ─────────────────────
create table public.availabilities (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 0 = domingo … 6 = sábado
  days_of_week smallint[] not null
    check (cardinality(days_of_week) between 1 and 7
           and days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  -- Tempo do DIA INTEIRO, dividido igualmente entre as sessões.
  daily_minutes int not null check (daily_minutes between 10 and 480),
  sessions_per_day smallint not null default 1 check (sessions_per_day between 1 and 4),
  start_date date not null,
  deadline date,
  -- Horário do lembrete, no fuso do perfil. Nulo = sem lembrete.
  reminder_time time,
  created_at timestamptz not null default now(),
  check (daily_minutes / sessions_per_day >= 10),
  check (deadline is null or deadline > start_date)
);
create index availabilities_subject_idx on public.availabilities (subject_id, created_at desc);

-- ─── Trilha (versionada: "Ajustar" cria a versão seguinte) ─────────────────
create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version int not null default 1,
  status text not null default 'generating'
    check (status in ('generating', 'ready', 'failed', 'superseded')),
  -- Orçamento que a IA recebeu e soma real das aulas (sempre ≤ orçamento).
  budget_minutes int not null,
  total_minutes int,
  lesson_max_minutes int not null,
  adjustment_request text check (char_length(adjustment_request) <= 600),
  model text,
  prompt_version text,
  failure_reason text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (subject_id, version)
);

alter table public.subjects
  add constraint subjects_active_path_fk
  foreign key (active_path_id) references public.learning_paths(id) on delete set null;

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position int not null,
  title text not null,
  objective text not null,
  -- O que este módulo pressupõe do anterior.
  builds_on text,
  unique (path_id, position)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  path_id uuid not null references public.learning_paths(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Ordem GLOBAL na trilha: é a ordem que o cronograma segue.
  position int not null,
  title text not null,
  objectives text[] not null default '{}',
  key_concepts text[] not null default '{}',
  estimated_minutes int not null check (estimated_minutes between 5 and 60),
  content_status text not null default 'pending'
    check (content_status in ('pending', 'generating', 'ready', 'failed')),
  -- Blocos: [{ type, title?, text?, items?, language? }]. Ver lib/ai/schemas.ts.
  content jsonb,
  summary text,
  reviewed boolean not null default false,
  model text,
  prompt_version text,
  generation_requested_at timestamptz,
  generated_at timestamptz,
  unique (path_id, position)
);
create index lessons_module_idx on public.lessons (module_id, position);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position int not null,
  kind text not null check (kind in ('multiple_choice', 'true_false')),
  prompt text not null,
  -- [{ id, text, explanation }]: explicação para cada alternativa, certa ou errada.
  options jsonb not null,
  correct_option_id text not null,
  concept text,
  unique (lesson_id, position)
);

-- ─── Sessões (hoje e o passado) ────────────────────────────────────────────
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_date date not null,
  slot smallint not null,
  planned_minutes int not null,
  status text not null default 'planned'
    check (status in ('planned', 'in_progress', 'completed', 'missed')),
  -- Sessão pedida pelo usuário além do cronograma ("estudar mais uma").
  is_extra boolean not null default false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (subject_id, scheduled_date, slot)
);
create index study_sessions_user_date_idx on public.study_sessions (user_id, scheduled_date);

create table public.session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position int not null,
  kind text not null default 'lesson' check (kind in ('lesson', 'review')),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  planned_minutes int not null,
  completed_at timestamptz,
  unique (session_id, position)
);

-- ─── Progresso ─────────────────────────────────────────────────────────────
create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  status text not null default 'completed' check (status in ('in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  correct_count int not null default 0,
  total_count int not null default 0,
  -- Revisão espaçada (depois do MVP). Ficam nulos até lá.
  review_due_on date,
  review_interval_days int,
  review_count int not null default 0,
  primary key (user_id, lesson_id)
);
create index lesson_progress_subject_idx on public.lesson_progress (subject_id);

create table public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  session_id uuid references public.study_sessions(id) on delete set null,
  chosen_option_id text not null,
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);
create index exercise_attempts_exercise_idx on public.exercise_attempts (user_id, exercise_id);

-- ─── Operação ──────────────────────────────────────────────────────────────
-- Registro de toda chamada de IA: custo por usuário, cota diária e investigação
-- de uma aula ruim (qual modelo e qual prompt a geraram).
create table public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  kind text not null
    check (kind in ('topic_profile', 'path_modules', 'module_lessons', 'lesson_content', 'accuracy_review')),
  ref_id uuid,
  status text not null check (status in ('succeeded', 'failed')),
  model text not null,
  prompt_version text not null,
  input_tokens int,
  output_tokens int,
  latency_ms int,
  error text,
  created_at timestamptz not null default now()
);
create index generation_jobs_user_day_idx on public.generation_jobs (user_id, created_at desc);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete cascade,
  reason text not null check (reason in ('wrong_fact', 'wrong_answer', 'confusing', 'other')),
  message text check (char_length(message) <= 1000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id) where active;

-- ─── RLS ───────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.availabilities enable row level security;
alter table public.learning_paths enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.exercises enable row level security;
alter table public.study_sessions enable row level security;
alter table public.session_items enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.exercise_attempts enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.content_reports enable row level security;
alter table public.push_tokens enable row level security;

-- Perfil: lê e edita o próprio. A linha nasce pelo trigger.
create policy profiles_select on public.profiles for select using (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Dados do usuário: acesso total ao que é dele.
create policy subjects_all on public.subjects for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy availabilities_all on public.availabilities for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy study_sessions_all on public.study_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy session_items_all on public.session_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lesson_progress_all on public.lesson_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exercise_attempts_all on public.exercise_attempts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_tokens_all on public.push_tokens for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Conteúdo gerado: só leitura. Quem escreve é o backend (service role).
create policy learning_paths_select on public.learning_paths for select using (user_id = auth.uid());
create policy modules_select on public.modules for select using (user_id = auth.uid());
create policy lessons_select on public.lessons for select using (user_id = auth.uid());
create policy exercises_select on public.exercises for select using (user_id = auth.uid());

-- Reportar erro: o usuário cria e lê os próprios.
create policy content_reports_insert on public.content_reports for insert with check (user_id = auth.uid());
create policy content_reports_select on public.content_reports for select using (user_id = auth.uid());

-- generation_jobs: sem policy. Só a service role lê e escreve.
