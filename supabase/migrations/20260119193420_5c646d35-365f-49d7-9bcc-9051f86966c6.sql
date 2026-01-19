-- Create feature_flags table - master list of all features
CREATE TABLE public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_feature_flags table - per-organization enablement
CREATE TABLE public.organization_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_flag_id UUID NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_at TIMESTAMP WITH TIME ZONE,
  enabled_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, feature_flag_id)
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS policies for feature_flags (read-only for authenticated, manage for super-admin)
CREATE POLICY "Authenticated users can view feature flags"
ON public.feature_flags FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super admins can manage feature flags"
ON public.feature_flags FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- RLS policies for organization_feature_flags
CREATE POLICY "Users can view their org feature flags"
ON public.organization_feature_flags FOR SELECT
TO authenticated
USING (
  public.user_in_organization(auth.uid(), organization_id)
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Super admins can manage org feature flags"
ON public.organization_feature_flags FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Insert initial feature flags for existing modules
INSERT INTO public.feature_flags (key, name, description, is_global) VALUES
  ('dashboard', 'Dashboard', 'Main dashboard with analytics and overview', true),
  ('work_management', 'Work Management', 'Projects, tasks, and kanban boards', true),
  ('calendar', 'Calendar', 'Calendar view and event management', true),
  ('knowledge_base', 'Knowledge Base', 'Documentation and knowledge articles', true),
  ('content_hub', 'Content Hub', 'Content management and publishing', true),
  ('community', 'Community', 'Community posts and discussions', true),
  ('requests', 'Requests', 'Request management system', true),
  ('crm', 'CRM', 'Customer relationship management', true),
  ('chat', 'Chat', 'Real-time messaging and conversations', true);