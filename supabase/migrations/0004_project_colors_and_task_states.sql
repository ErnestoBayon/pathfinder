-- Pathfinder — Phase 2.1: color de proyecto + estados de tarea (todo/doing/done).
-- Documenta cambios YA aplicados manualmente en la DB de producción (Supabase).
-- Idempotente (IF [NOT] EXISTS / IF EXISTS).

-- 1) projects: color de acento (hex), default azul Pathfinder.
alter table projects add column if not exists color text default '#5B5BD6';

-- 2) tasks: bandera de tarea sugerida por la IA (aún no confirmada).
alter table tasks add column if not exists suggested boolean default false;

-- 3) tasks.estado: migrar de 'pending'/'done' a 'todo'/'doing'/'done'.
alter table tasks drop constraint if exists tasks_estado_check;
update tasks set estado = 'todo' where estado = 'pending';
alter table tasks add constraint tasks_estado_check check (estado in ('todo', 'doing', 'done'));
