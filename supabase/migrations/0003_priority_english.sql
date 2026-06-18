-- Pathfinder — migra los valores de `tasks.prioridad` de español a inglés.
-- Correr en el SQL Editor de Supabase. Idempotente (puede re-correrse sin daño).
--
--   'alta'  → 'High'
--   'media' → 'Medium'
--   'baja'  → 'Low'

-- 1) Quitar cualquier CHECK que restrinja `prioridad` (p. ej. in ('alta','media','baja')),
--    para que el UPDATE no choque con la restricción vieja. Re-corrible: también borra
--    el check nuevo de una corrida previa antes de volver a crearlo abajo.
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'tasks'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%prioridad%'
  loop
    execute format('alter table tasks drop constraint %I', c.conname);
  end loop;
end $$;

-- 2) Soltar el default viejo ('media') mientras migramos los datos.
alter table tasks alter column prioridad drop default;

-- 3) Migrar los valores existentes (no toca filas ya migradas).
update tasks set prioridad = 'High'   where prioridad = 'alta';
update tasks set prioridad = 'Medium' where prioridad = 'media';
update tasks set prioridad = 'Low'    where prioridad = 'baja';

-- 4) Nuevo default en inglés.
alter table tasks alter column prioridad set default 'Medium';

-- 5) Re-crear el CHECK con los valores en inglés.
alter table tasks
  add constraint tasks_prioridad_check check (prioridad in ('High', 'Medium', 'Low'));
