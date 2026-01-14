-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worksheet_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_select_all" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Children policies (parents can manage their own children)
CREATE POLICY "children_select_own" ON public.children FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "children_insert_own" ON public.children FOR INSERT WITH CHECK (parent_id = auth.uid());
CREATE POLICY "children_update_own" ON public.children FOR UPDATE USING (parent_id = auth.uid());
CREATE POLICY "children_delete_own" ON public.children FOR DELETE USING (parent_id = auth.uid());
CREATE POLICY "children_admin_select_all" ON public.children FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Subjects policies (public read, admin write)
CREATE POLICY "subjects_select_all" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "subjects_admin_insert" ON public.subjects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "subjects_admin_update" ON public.subjects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Worksheets policies
CREATE POLICY "worksheets_select_approved" ON public.worksheets FOR SELECT USING (is_approved = true);
CREATE POLICY "worksheets_select_own" ON public.worksheets FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "worksheets_insert_auth" ON public.worksheets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "worksheets_admin_all" ON public.worksheets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Worksheet assignments policies
CREATE POLICY "assignments_select_parent" ON public.worksheet_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
);
CREATE POLICY "assignments_insert_parent" ON public.worksheet_assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
);
CREATE POLICY "assignments_update_parent" ON public.worksheet_assignments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
);

-- Worksheet submissions policies
CREATE POLICY "submissions_select_parent" ON public.worksheet_submissions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
);
CREATE POLICY "submissions_insert_child" ON public.worksheet_submissions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
);

-- Progress policies
CREATE POLICY "progress_select_parent" ON public.progress FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.children WHERE id = child_id AND parent_id = auth.uid())
);
CREATE POLICY "progress_admin_all" ON public.progress FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Subscriptions policies
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "subscriptions_insert_own" ON public.subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "subscriptions_update_own" ON public.subscriptions FOR UPDATE USING (user_id = auth.uid());

-- Notifications policies
CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE USING (user_id = auth.uid());
