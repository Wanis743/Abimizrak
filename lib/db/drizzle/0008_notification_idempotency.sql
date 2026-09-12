ALTER TABLE public.campus_notifications
  ADD COLUMN IF NOT EXISTS source_key text,
  ADD COLUMN IF NOT EXISTS metadata jsonb;

UPDATE public.campus_notifications
SET source_key = id
WHERE source_key IS NULL;

ALTER TABLE public.campus_notifications
  ALTER COLUMN source_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS campus_notifications_recipient_event_source_idx
  ON public.campus_notifications(user_id, kind, source_key);
