ALTER TABLE public.campus_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_facility_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_verification_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON public.campus_notifications FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()::text));
CREATE POLICY notifications_update_own ON public.campus_notifications FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()::text)) WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY comments_select_members ON public.campus_post_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.campus_posts p JOIN public.campus_memberships m ON m.space_id = p.space_id WHERE p.id = campus_post_comments.post_id AND m.user_id = (SELECT auth.uid()::text)));
CREATE POLICY comments_insert_self_members ON public.campus_post_comments FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()::text) AND EXISTS (SELECT 1 FROM public.campus_posts p JOIN public.campus_memberships m ON m.space_id = p.space_id WHERE p.id = campus_post_comments.post_id AND m.user_id = (SELECT auth.uid()::text)));
CREATE POLICY comments_update_self ON public.campus_post_comments FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()::text)) WITH CHECK (user_id = (SELECT auth.uid()::text));
CREATE POLICY comments_delete_self ON public.campus_post_comments FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY reactions_select_members ON public.campus_post_reactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.campus_posts p JOIN public.campus_memberships m ON m.space_id = p.space_id WHERE p.id = campus_post_reactions.post_id AND m.user_id = (SELECT auth.uid()::text)));
CREATE POLICY reactions_insert_self_members ON public.campus_post_reactions FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()::text) AND EXISTS (SELECT 1 FROM public.campus_posts p JOIN public.campus_memberships m ON m.space_id = p.space_id WHERE p.id = campus_post_reactions.post_id AND m.user_id = (SELECT auth.uid()::text)));
CREATE POLICY reactions_delete_self ON public.campus_post_reactions FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()::text));

CREATE POLICY presence_select_own ON public.campus_presence FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()::text));
CREATE POLICY presence_insert_self ON public.campus_presence FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()::text));
CREATE POLICY presence_update_self ON public.campus_presence FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()::text)) WITH CHECK (user_id = (SELECT auth.uid()::text));

CREATE POLICY facility_issue_select_own ON public.campus_facility_issues FOR SELECT TO authenticated USING (reporter_id = (SELECT auth.uid()::text));
CREATE POLICY facility_issue_insert_self ON public.campus_facility_issues FOR INSERT TO authenticated WITH CHECK (reporter_id = (SELECT auth.uid()::text));
CREATE POLICY facility_issue_update_self ON public.campus_facility_issues FOR UPDATE TO authenticated USING (reporter_id = (SELECT auth.uid()::text)) WITH CHECK (reporter_id = (SELECT auth.uid()::text));

CREATE POLICY threads_select_members ON public.campus_threads FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.campus_channels c JOIN public.campus_memberships m ON m.space_id = c.space_id WHERE c.id = campus_threads.channel_id AND m.user_id = (SELECT auth.uid()::text)));
CREATE POLICY threads_insert_self_members ON public.campus_threads FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()::text) AND EXISTS (SELECT 1 FROM public.campus_channels c JOIN public.campus_memberships m ON m.space_id = c.space_id WHERE c.id = campus_threads.channel_id AND m.user_id = (SELECT auth.uid()::text)));

CREATE POLICY verification_audits_select_self ON public.campus_verification_audits FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()::text));
