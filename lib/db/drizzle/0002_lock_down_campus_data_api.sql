-- Align the local migration history with the Supabase production hardening
-- migration `20260908080041_lock_down_campus_data_api`.
--
-- The migration removes legacy public Data API policies from campus_* tables
-- and leaves authenticated, membership-scoped Realtime reads for messages.

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename LIKE 'campus_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

CREATE POLICY campus_messages_realtime_select
  ON public.campus_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campus_memberships sm
      JOIN public.campus_members cm ON cm.user_id = sm.user_id
      WHERE sm.space_id = campus_messages.space_id
        AND sm.user_id = (SELECT auth.uid())::text
        AND cm.membership_status = 'approved'
        AND cm.role_status = 'approved'
    )
    OR EXISTS (
      SELECT 1
      FROM public.campus_project_members pm
      WHERE pm.project_id = campus_messages.space_id
        AND pm.user_id = (SELECT auth.uid())::text
    )
  );

GRANT SELECT ON TABLE public.campus_messages TO authenticated;
