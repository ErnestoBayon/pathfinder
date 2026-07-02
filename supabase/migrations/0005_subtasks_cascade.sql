-- Pathfinder — Phase 2.4c: add ON DELETE CASCADE to subtasks.task_id FK.
-- Retroactively documents the subtasks table (created ad-hoc, no prior migration).
-- Run in the Supabase SQL Editor. Safe to re-run (drops+re-adds idempotently).

-- Drop existing FK constraint. Dynamic block handles naming variance from ad-hoc creation.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'subtasks'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) ilike '%tasks%'
  loop
    execute format('alter table subtasks drop constraint %I', c.conname);
  end loop;
end $$;

-- Re-add with ON DELETE CASCADE so deleting a task removes its subtasks automatically.
alter table subtasks
  add constraint subtasks_task_id_fkey
  foreign key (task_id) references tasks(id) on delete cascade;
