ALTER TABLE public.campus_projects
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

ALTER TABLE public.campus_projects
  DROP CONSTRAINT IF EXISTS campus_projects_visibility_check;
ALTER TABLE public.campus_projects
  ADD CONSTRAINT campus_projects_visibility_check
  CHECK (visibility IN ('public', 'private'));

ALTER TABLE public.campus_projects
  DROP CONSTRAINT IF EXISTS campus_projects_status_check;
ALTER TABLE public.campus_projects
  ADD CONSTRAINT campus_projects_status_check
  CHECK (status IN ('idea', 'active', 'completed'));
