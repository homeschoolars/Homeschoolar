-- Fix RLS infinite recursion issue
-- The problem: policies that query the profiles table cause infinite recursion

-- First, drop the problematic policies
DROP POLICY IF EXISTS "profiles_admin_select_all" ON public.profiles;
DROP POLICY IF EXISTS "children_admin_select_all" ON public.children;
DROP POLICY IF EXISTS "subjects_admin_insert" ON public.subjects;
DROP POLICY IF EXISTS "subjects_admin_update" ON public.subjects;
DROP POLICY IF EXISTS "worksheets_admin_all" ON public.worksheets;
DROP POLICY IF EXISTS "progress_admin_all" ON public.progress;

-- Create a security definer function to check admin role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Recreate profiles policies without recursion
-- Users can always read their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (
    auth.uid() = id OR public.is_admin()
  );

-- Recreate children policies  
DROP POLICY IF EXISTS "children_select_own" ON public.children;
CREATE POLICY "children_select_own" ON public.children 
  FOR SELECT USING (
    parent_id = auth.uid() OR public.is_admin()
  );

-- Recreate subjects policies (still allow public read)
DROP POLICY IF EXISTS "subjects_select_all" ON public.subjects;
CREATE POLICY "subjects_select_all" ON public.subjects 
  FOR SELECT USING (true);

CREATE POLICY "subjects_admin_insert" ON public.subjects 
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "subjects_admin_update" ON public.subjects 
  FOR UPDATE USING (public.is_admin());

-- Recreate worksheets admin policy
CREATE POLICY "worksheets_admin_all" ON public.worksheets 
  FOR ALL USING (public.is_admin());

-- Recreate progress admin policy
CREATE POLICY "progress_admin_all" ON public.progress 
  FOR ALL USING (public.is_admin());

-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
