CREATE TABLE IF NOT EXISTS public.campus_channel_reads (
  id text PRIMARY KEY,
  channel_id text NOT NULL REFERENCES public.campus_channels(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campus_channel_reads_user_channel_unique UNIQUE(user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS campus_channel_reads_channel_id_idx
  ON public.campus_channel_reads(channel_id);

ALTER TABLE public.campus_channel_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY channel_reads_select_self
  ON public.campus_channel_reads FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY channel_reads_insert_self_member
  ON public.campus_channel_reads FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid()::text)
    AND EXISTS (
      SELECT 1
      FROM public.campus_channels channel
      JOIN public.campus_memberships membership ON membership.space_id = channel.space_id
      WHERE channel.id = campus_channel_reads.channel_id
        AND membership.user_id = (SELECT auth.uid()::text)
    )
  );

CREATE POLICY channel_reads_update_self_member
  ON public.campus_channel_reads FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()::text))
  WITH CHECK (
    user_id = (SELECT auth.uid()::text)
    AND EXISTS (
      SELECT 1
      FROM public.campus_channels channel
      JOIN public.campus_memberships membership ON membership.space_id = channel.space_id
      WHERE channel.id = campus_channel_reads.channel_id
        AND membership.user_id = (SELECT auth.uid()::text)
    )
  );
