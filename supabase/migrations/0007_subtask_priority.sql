-- Pathfinder — add priority field to subtasks table (mirrors tasks.prioridad).
-- Migration already applied in Supabase; committed here for history only.

alter table subtasks
  add column if not exists prioridad text not null default 'Medium';

alter table subtasks
  add constraint subtasks_prioridad_check
  check (prioridad in ('High', 'Medium', 'Low'));
