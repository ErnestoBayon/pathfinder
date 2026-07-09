-- 0008: add is_demo to projects
-- Marks demo/seed projects so their task events are excluded from experiment_events.
ALTER TABLE projects ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
