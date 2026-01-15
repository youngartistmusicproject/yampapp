-- Phase 1 & 2: Add missing organization_id columns and migrate data

-- Add organization_id to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to community_posts table
ALTER TABLE public.community_posts 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Add organization_id to community_comments table
ALTER TABLE public.community_comments 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Ensure Default Organization exists
INSERT INTO public.organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default')
ON CONFLICT (id) DO NOTHING;

-- Migrate existing users from user_roles to organization_members
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', user_id, role
FROM public.user_roles
ON CONFLICT DO NOTHING;

-- Set primary_organization_id for profiles that don't have one
UPDATE public.profiles
SET primary_organization_id = '00000000-0000-0000-0000-000000000001'
WHERE primary_organization_id IS NULL;

-- Migrate existing data to Default Organization
UPDATE public.tasks SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.projects SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.areas SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.knowledge_documents SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.conversations SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.community_groups SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.community_posts SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.community_comments SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.activity_log SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Update RLS policies for tasks to be organization-scoped
DROP POLICY IF EXISTS "Staff and above can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Staff and above can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "Staff and above can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON public.tasks;

CREATE POLICY "Users can view tasks in their org"
ON public.tasks FOR SELECT
USING (
  organization_id IN (SELECT unnest(public.get_user_organization_ids(auth.uid())))
);

CREATE POLICY "Users can insert tasks in their org"
ON public.tasks FOR INSERT
WITH CHECK (
  organization_id IN (SELECT unnest(public.get_user_organization_ids(auth.uid())))
);

CREATE POLICY "Users can update tasks in their org"
ON public.tasks FOR UPDATE
USING (
  organization_id IN (SELECT unnest(public.get_user_organization_ids(auth.uid())))
);

CREATE POLICY "Org admins can delete tasks"
ON public.tasks FOR DELETE
USING (
  public.is_org_admin(auth.uid(), organization_id) OR public.is_super_admin(auth.uid())
);

-- Update RLS policies for community_posts
DROP POLICY IF EXISTS "Authenticated users can view posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.community_posts;

CREATE POLICY "Users can view posts in their org"
ON public.community_posts FOR SELECT
USING (
  organization_id IN (SELECT unnest(public.get_user_organization_ids(auth.uid())))
);

CREATE POLICY "Users can insert posts in their org"
ON public.community_posts FOR INSERT
WITH CHECK (
  organization_id IN (SELECT unnest(public.get_user_organization_ids(auth.uid())))
);

CREATE POLICY "Users can update own posts"
ON public.community_posts FOR UPDATE
USING (
  author_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete own posts"
ON public.community_posts FOR DELETE
USING (
  author_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);

-- Update RLS policies for community_comments
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.community_comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.community_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.community_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.community_comments;

CREATE POLICY "Users can view comments in their org"
ON public.community_comments FOR SELECT
USING (
  organization_id IN (SELECT unnest(public.get_user_organization_ids(auth.uid())))
);

CREATE POLICY "Users can insert comments in their org"
ON public.community_comments FOR INSERT
WITH CHECK (
  organization_id IN (SELECT unnest(public.get_user_organization_ids(auth.uid())))
);

CREATE POLICY "Users can update own comments"
ON public.community_comments FOR UPDATE
USING (
  author_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete own comments"
ON public.community_comments FOR DELETE
USING (
  author_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);