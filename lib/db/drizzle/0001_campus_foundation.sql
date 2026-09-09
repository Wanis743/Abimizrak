ALTER TABLE campus_members
  ALTER COLUMN verified SET DEFAULT false;

ALTER TABLE campus_members
  ADD COLUMN IF NOT EXISTS membership_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS role_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS requested_role TEXT NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_review_note TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by TEXT;

UPDATE campus_members
SET membership_status = CASE WHEN verified THEN 'approved' ELSE 'pending' END,
    role_status = CASE WHEN verified THEN 'approved' ELSE 'pending' END,
    requested_role = role,
    verified_at = CASE WHEN verified THEN COALESCE(verified_at, created_at) ELSE NULL END
WHERE membership_status = 'pending' AND role_status = 'pending';

CREATE TABLE IF NOT EXISTS campus_verification_audits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campus_verification_audits_user_idx ON campus_verification_audits(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS campus_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campus_notifications_user_idx ON campus_notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS campus_post_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES campus_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS campus_post_comments_post_idx ON campus_post_comments(post_id, created_at);

CREATE TABLE IF NOT EXISTS campus_post_reactions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES campus_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  reaction TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT campus_post_reactions_unique UNIQUE(post_id, user_id, reaction)
);

CREATE TABLE IF NOT EXISTS campus_threads (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES campus_channels(id) ON DELETE CASCADE,
  root_message_id TEXT NOT NULL REFERENCES campus_messages(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_presence (
  user_id TEXT PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'offline',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  building TEXT,
  capacity INTEGER,
  kind TEXT NOT NULL DEFAULT 'classroom',
  status TEXT NOT NULL DEFAULT 'available',
  metadata TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campus_facility_issues (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES campus_rooms(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE campus_memberships ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';
