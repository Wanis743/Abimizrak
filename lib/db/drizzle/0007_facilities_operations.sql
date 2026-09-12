ALTER TABLE public.campus_facility_issues
  ADD COLUMN IF NOT EXISTS assignee_id text,
  ADD COLUMN IF NOT EXISTS resolution text;

UPDATE public.campus_facility_issues SET status = 'reported' WHERE status = 'open';

ALTER TABLE public.campus_facility_issues
  ALTER COLUMN status SET DEFAULT 'reported';

ALTER TABLE public.campus_facility_issues
  ADD CONSTRAINT campus_facility_issues_status_check
  CHECK (status IN ('reported', 'assigned', 'in_progress', 'resolved', 'closed'));

CREATE TABLE IF NOT EXISTS public.campus_facility_issue_history (
  id text PRIMARY KEY,
  issue_id text NOT NULL REFERENCES public.campus_facility_issues(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  assignee_id text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campus_facility_issue_history_from_status_check
    CHECK (from_status IS NULL OR from_status IN ('reported', 'assigned', 'in_progress', 'resolved', 'closed')),
  CONSTRAINT campus_facility_issue_history_to_status_check
    CHECK (to_status IN ('reported', 'assigned', 'in_progress', 'resolved', 'closed'))
);

CREATE INDEX IF NOT EXISTS campus_facility_issue_history_issue_created_idx
  ON public.campus_facility_issue_history(issue_id, created_at);

ALTER TABLE public.campus_facility_issue_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY facility_issue_history_select_reporter
  ON public.campus_facility_issue_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campus_facility_issues issue
    WHERE issue.id = campus_facility_issue_history.issue_id
      AND issue.reporter_id = (SELECT auth.uid()::text)
  ));

DROP POLICY IF EXISTS facility_issue_update_self ON public.campus_facility_issues;
