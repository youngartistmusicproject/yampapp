-- Phase 2: Update RLS policies to be organization-scoped

-- 2.1 Update projects RLS policies
DROP POLICY IF EXISTS "Admins can manage all projects" ON public.projects;
DROP POLICY IF EXISTS "Members can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Members can view their projects" ON public.projects;

-- Projects: Users can view projects in their organization
CREATE POLICY "Users can view org projects"
ON public.projects FOR SELECT
USING (
  organization_id IS NULL OR
  organization_id = ANY(public.get_user_organization_ids(auth.uid()))
);

-- Projects: Org admins can manage projects
CREATE POLICY "Org admins can manage projects"
ON public.projects FOR ALL
USING (
  public.is_admin(auth.uid()) OR
  public.is_org_admin(auth.uid(), organization_id)
)
WITH CHECK (
  public.is_admin(auth.uid()) OR
  public.is_org_admin(auth.uid(), organization_id)
);

-- Projects: Members can update their assigned projects
CREATE POLICY "Members can update assigned projects"
ON public.projects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = projects.id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = projects.id AND user_id = auth.uid()
  )
);

-- 2.2 Update areas RLS policies
DROP POLICY IF EXISTS "Admins can manage areas" ON public.areas;
DROP POLICY IF EXISTS "All authenticated can view areas" ON public.areas;

CREATE POLICY "Users can view org areas"
ON public.areas FOR SELECT
USING (
  organization_id IS NULL OR
  organization_id = ANY(public.get_user_organization_ids(auth.uid()))
);

CREATE POLICY "Org admins can manage areas"
ON public.areas FOR ALL
USING (
  public.is_admin(auth.uid()) OR
  public.is_org_admin(auth.uid(), organization_id)
)
WITH CHECK (
  public.is_admin(auth.uid()) OR
  public.is_org_admin(auth.uid(), organization_id)
);

-- 2.3 Update knowledge_documents RLS policies
DROP POLICY IF EXISTS "Anyone can view knowledge documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Authenticated users can create documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON public.knowledge_documents;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON public.knowledge_documents;

CREATE POLICY "Users can view org documents"
ON public.knowledge_documents FOR SELECT
USING (
  organization_id IS NULL OR
  organization_id = ANY(public.get_user_organization_ids(auth.uid()))
);

CREATE POLICY "Org members can create documents"
ON public.knowledge_documents FOR INSERT
WITH CHECK (
  organization_id IS NULL OR
  public.user_in_organization(auth.uid(), organization_id)
);

CREATE POLICY "Org members can update documents"
ON public.knowledge_documents FOR UPDATE
USING (
  organization_id IS NULL OR
  public.user_in_organization(auth.uid(), organization_id)
);

CREATE POLICY "Org admins can delete documents"
ON public.knowledge_documents FOR DELETE
USING (
  public.is_admin(auth.uid()) OR
  public.is_org_admin(auth.uid(), organization_id)
);

-- 2.4 Update conversations RLS policies
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can view org conversations"
ON public.conversations FOR SELECT
USING (
  (organization_id IS NULL OR organization_id = ANY(public.get_user_organization_ids(auth.uid()))) AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can create org conversations"
ON public.conversations FOR INSERT
WITH CHECK (
  organization_id IS NULL OR
  public.user_in_organization(auth.uid(), organization_id)
);

CREATE POLICY "Participants can update org conversations"
ON public.conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  )
);

-- 2.5 Update community_groups RLS policies
DROP POLICY IF EXISTS "Anyone can view community groups" ON public.community_groups;
DROP POLICY IF EXISTS "Admins can create community groups" ON public.community_groups;
DROP POLICY IF EXISTS "Admins can delete community groups" ON public.community_groups;
DROP POLICY IF EXISTS "Admins can update community groups" ON public.community_groups;

CREATE POLICY "Users can view org community groups"
ON public.community_groups FOR SELECT
USING (
  organization_id IS NULL OR
  organization_id = ANY(public.get_user_organization_ids(auth.uid()))
);

CREATE POLICY "Org admins can create community groups"
ON public.community_groups FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid()) OR
  public.is_org_admin(auth.uid(), organization_id)
);

CREATE POLICY "Org admins can update community groups"
ON public.community_groups FOR UPDATE
USING (
  public.is_admin(auth.uid()) OR
  public.is_org_admin(auth.uid(), organization_id)
)
WITH CHECK (
  public.is_admin(auth.uid()) OR
  public.is_org_admin(auth.uid(), organization_id)
);

CREATE POLICY "Org admins can delete community groups"
ON public.community_groups FOR DELETE
USING (
  public.is_admin(auth.uid()) OR
  public.is_org_admin(auth.uid(), organization_id)
);

-- 2.6 Update activity_log RLS policies  
DROP POLICY IF EXISTS "Users can view relevant activity" ON public.activity_log;
DROP POLICY IF EXISTS "Users can log own activity" ON public.activity_log;
DROP POLICY IF EXISTS "No deletes from activity log" ON public.activity_log;
DROP POLICY IF EXISTS "No updates to activity log" ON public.activity_log;

CREATE POLICY "Users can view org activity"
ON public.activity_log FOR SELECT
USING (
  organization_id IS NULL OR
  organization_id = ANY(public.get_user_organization_ids(auth.uid()))
);

CREATE POLICY "Users can log activity in their org"
ON public.activity_log FOR INSERT
WITH CHECK (
  organization_id IS NULL OR
  public.user_in_organization(auth.uid(), organization_id)
);

CREATE POLICY "No updates to activity log"
ON public.activity_log FOR UPDATE
USING (false);

CREATE POLICY "No deletes from activity log"
ON public.activity_log FOR DELETE
USING (false);