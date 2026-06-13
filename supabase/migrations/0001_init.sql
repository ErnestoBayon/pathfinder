-- Pathfinder — esquema de persistencia (nivel pb-4).
-- Correr en el SQL Editor de Supabase. Es idempotente (usa IF NOT EXISTS).
--
-- Decisiones:
--  * PKs en TEXT para conservar los ids actuales del JSON ("proyecto-0", "pb-1",
--    "q-setup-1", etc.) y no romper el contrato de la app ni el chat (complete_quest usa ids).
--  * `orden` en levels y en quests para mantener el orden de display estable
--    (única adición al esquema pedido: quests también lleva `orden`).
--  * RLS activado SIN policies: el rol anónimo/público no puede leer ni escribir.
--    El service role (que usa el backend) hace bypass de RLS. La key secreta solo vive
--    server-side, así que nadie toca los datos sin pasar por nuestras API routes.

create table if not exists projects (
  id          text primary key,
  nombre      text        not null,
  template    text        not null,
  xp_total    integer     not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists levels (
  id          text primary key,
  project_id  text        not null references projects(id) on delete cascade,
  nombre      text        not null,
  descripcion text        not null,
  orden       integer     not null,
  estado      text        not null check (estado in ('done','active','locked'))
);

create table if not exists quests (
  id        text primary key,
  level_id  text        not null references levels(id) on delete cascade,
  texto     text        not null,
  estado    text        not null check (estado in ('done','pending')),
  deadline  timestamptz,
  xp        integer     not null default 0,
  orden     integer     not null default 0
);

create table if not exists activity_log (
  id           bigint generated always as identity primary key,
  project_id   text        not null references projects(id) on delete cascade,
  "timestamp"  timestamptz not null default now(),
  tipo         text        not null check (tipo in ('quest_completed','quest_added','message','level_unlocked')),
  descripcion  text        not null
);

-- Índices para las consultas de la app.
create index if not exists levels_project_orden_idx on levels (project_id, orden);
create index if not exists quests_level_orden_idx   on quests (level_id, orden);
create index if not exists activity_project_ts_idx  on activity_log (project_id, "timestamp");

-- RLS: denegar al público, permitir solo al service role (bypass).
alter table projects     enable row level security;
alter table levels       enable row level security;
alter table quests       enable row level security;
alter table activity_log enable row level security;
