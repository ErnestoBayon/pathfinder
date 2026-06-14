-- Pathfinder — migración a v2 (task manager sin gamificación).
-- Correr en el SQL Editor de Supabase. Idempotente (IF [NOT] EXISTS).
--
-- Resultado del esquema v2:
--   projects     → id, nombre, descripcion, created_at
--   tasks        → id, project_id, texto, estado('pending'/'done'), deadline, created_at
--   activity_log → id, project_id, timestamp, descripcion

-- 1) projects: agregar `descripcion`; quitar columnas de gamificación.
alter table projects add column if not exists descripcion text not null default '';
alter table projects drop column if exists template;
alter table projects drop column if exists xp_total;

-- 2) tasks: tabla nueva del dominio v2.
create table if not exists tasks (
  id          text        primary key,
  project_id  text        not null references projects(id) on delete cascade,
  texto       text        not null,
  estado      text        not null default 'pending' check (estado in ('pending','done')),
  deadline    timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists tasks_project_idx on tasks (project_id);

-- 3) activity_log: quitar la columna `tipo` (y su check) — ya no hay tipos de gamificación.
alter table activity_log drop column if exists tipo;

-- 4) Eliminar las tablas de gamificación que ya no se usan (quests referencia levels).
drop table if exists quests;
drop table if exists levels;

-- 5) RLS en la nueva tabla: denegar al público; el service role (backend) hace bypass.
alter table tasks enable row level security;
