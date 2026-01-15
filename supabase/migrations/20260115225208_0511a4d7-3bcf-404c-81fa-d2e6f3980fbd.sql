-- Phase 1: Multi-tenancy Infrastructure

-- 1.1 Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 1.2 Create organization_members table (per-org roles)
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 1.3 Security definer functions for organization access
CREATE OR REPLACE FUNCTION public.get_user_organization_ids(_user_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(organization_id), '{}')
  FROM public.organization_members
  WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.user_in_organization(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_org_role(_user_id UUID, _org_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.organization_members
  WHERE user_id = _user_id AND organization_id = _org_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id 
    AND organization_id = _org_id
    AND role IN ('super-admin', 'admin')
  )
$$;

-- 1.4 RLS policies for organizations table
CREATE POLICY "Users can view their organizations"
ON public.organizations FOR SELECT
USING (
  id = ANY(public.get_user_organization_ids(auth.uid()))
);

CREATE POLICY "Org admins can update their organization"
ON public.organizations FOR UPDATE
USING (public.is_org_admin(auth.uid(), id))
WITH CHECK (public.is_org_admin(auth.uid(), id));

CREATE POLICY "Super-admins can create organizations"
ON public.organizations FOR INSERT
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super-admins can delete organizations"
ON public.organizations FOR DELETE
USING (public.is_super_admin(auth.uid()));

-- 1.5 RLS policies for organization_members table
CREATE POLICY "Users can view members of their organizations"
ON public.organization_members FOR SELECT
USING (
  organization_id = ANY(public.get_user_organization_ids(auth.uid()))
);

CREATE POLICY "Org admins can manage members"
ON public.organization_members FOR ALL
USING (public.is_org_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Super-admins can manage all members"
ON public.organization_members FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- 1.6 Add organization_id to projects (nullable initially for migration)
ALTER TABLE public.projects ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- 1.7 Add organization_id to areas
ALTER TABLE public.areas ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- 1.8 Add organization_id to knowledge_documents
ALTER TABLE public.knowledge_documents ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- 1.9 Add organization_id to conversations
ALTER TABLE public.conversations ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- 1.10 Add organization_id to community_groups
ALTER TABLE public.community_groups ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- 1.11 Add organization_id to activity_log
ALTER TABLE public.activity_log ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- 1.12 Create indexes for performance
CREATE INDEX idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_projects_org_id ON public.projects(organization_id);
CREATE INDEX idx_areas_org_id ON public.areas(organization_id);
CREATE INDEX idx_knowledge_documents_org_id ON public.knowledge_documents(organization_id);
CREATE INDEX idx_conversations_org_id ON public.conversations(organization_id);
CREATE INDEX idx_community_groups_org_id ON public.community_groups(organization_id);
CREATE INDEX idx_activity_log_org_id ON public.activity_log(organization_id);

-- 1.13 Trigger for updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();