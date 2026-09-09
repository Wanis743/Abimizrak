CREATE TABLE IF NOT EXISTS public.campus_moderation_reports (
  id text PRIMARY KEY, reporter_id text NOT NULL, target_type text NOT NULL, target_id text NOT NULL,
  reason text NOT NULL, details text, status text NOT NULL DEFAULT 'open', reviewer_id text, resolution text,
  created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz
);
CREATE INDEX IF NOT EXISTS campus_moderation_reports_target_idx ON public.campus_moderation_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS campus_moderation_reports_status_idx ON public.campus_moderation_reports(status, created_at);
CREATE INDEX IF NOT EXISTS campus_moderation_reports_reporter_idx ON public.campus_moderation_reports(reporter_id, created_at);
CREATE INDEX IF NOT EXISTS campus_notifications_user_created_idx ON public.campus_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS campus_comments_post_created_idx ON public.campus_post_comments(post_id, created_at);
ALTER TABLE public.campus_moderation_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS campus_moderation_reports_no_direct_client_access ON public.campus_moderation_reports;
CREATE POLICY campus_moderation_reports_no_direct_client_access ON public.campus_moderation_reports FOR ALL TO authenticated USING (false) WITH CHECK (false);
