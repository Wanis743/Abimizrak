CREATE TABLE IF NOT EXISTS public.campus_thread_reads (
  id text PRIMARY KEY,
  thread_id text NOT NULL REFERENCES public.campus_threads(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campus_thread_reads_user_thread_unique UNIQUE(user_id, thread_id)
);

CREATE INDEX IF NOT EXISTS campus_thread_reads_thread_id_idx
  ON public.campus_thread_reads(thread_id);

ALTER TABLE public.campus_thread_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY thread_reads_select_self
  ON public.campus_thread_reads FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY thread_reads_insert_self_member
  ON public.campus_thread_reads FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid()::text)
    AND EXISTS (
      SELECT 1 FROM public.campus_threads thread
      JOIN public.campus_channels channel ON channel.id = thread.channel_id
      JOIN public.campus_memberships membership ON membership.space_id = channel.space_id
      WHERE thread.id = campus_thread_reads.thread_id
        AND membership.user_id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY thread_reads_update_self_member
  ON public.campus_thread_reads FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()::text))
  WITH CHECK (
    user_id = (SELECT auth.uid()::text)
    AND EXISTS (
      SELECT 1 FROM public.campus_threads thread
      JOIN public.campus_channels channel ON channel.id = thread.channel_id
      JOIN public.campus_memberships membership ON membership.space_id = channel.space_id
      WHERE thread.id = campus_thread_reads.thread_id
        AND membership.user_id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY presence_select_approved_members
  ON public.campus_presence FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campus_members member
    WHERE member.user_id = (SELECT auth.uid()::text)
      AND member.membership_status = 'approved'
  ));

CREATE POLICY presence_insert_self
  ON public.campus_presence FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY presence_update_self
  ON public.campus_presence FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()::text))
  WITH CHECK (user_id = (SELECT auth.uid()::text));
