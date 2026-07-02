-- Pathfinder — Phase 2.4c: change experiment_events.task_id FK to ON DELETE SET NULL.
-- Retroactively documents the experiment_events table (created ad-hoc, no prior migration).
-- SET NULL preserves analytical event rows when their parent task is deleted.
-- Run in the Supabase SQL Editor. Safe to re-run (drops+re-adds idempotently).

-- Drop existing FK constraint. Dynamic block handles naming variance from ad-hoc creation.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'experiment_events'::regclass
      and contype = 'f'
      and pg_get_constraintdef(oid) ilike '%tasks%'
  loop
    execute format('alter table experiment_events drop constraint %I', c.conname);
  end loop;
end $$;

-- Re-add with ON DELETE SET NULL so deleting a task nulls task_id but keeps the event row.
alter table experiment_events
  add constraint experiment_events_task_id_fkey
  foreign key (task_id) references tasks(id) on delete set null;
