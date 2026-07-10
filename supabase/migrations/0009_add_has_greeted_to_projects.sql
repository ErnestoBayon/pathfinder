-- 0009: add has_greeted to projects
-- Atomic claim flag used by /api/chat to guarantee exactly one proactive PM
-- greet per project, even when multiple page reloads arrive while the first
-- greet's assistant message is still in-flight (not yet persisted).
ALTER TABLE projects ADD COLUMN has_greeted boolean NOT NULL DEFAULT false;
