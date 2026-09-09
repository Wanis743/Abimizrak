-- Enable RLS on all tables
ALTER TABLE "campus_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campus_attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campus_channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campus_direct_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campus_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campus_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campus_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campus_posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campus_spaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campus_submissions" ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users for spaces and members
CREATE POLICY "Allow read spaces for authenticated users" ON "campus_spaces" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read members for authenticated users" ON "campus_members" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read channels for authenticated users" ON "campus_channels" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read messages for authenticated users" ON "campus_messages" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert messages for authenticated users" ON "campus_messages" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id::uuid);

-- More specific policies can be added later
