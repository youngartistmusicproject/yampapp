-- Create invitations table for email invitation system
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  first_name TEXT,
  last_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for token lookups
CREATE INDEX idx_invitations_token ON public.invitations(token);

-- Create index for organization lookups
CREATE INDEX idx_invitations_organization ON public.invitations(organization_id);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Org admins can view invitations for their organization
CREATE POLICY "Org admins can view invitations"
ON public.invitations
FOR SELECT
USING (
  is_org_admin(auth.uid(), organization_id)
  OR is_super_admin(auth.uid())
);

-- Policy: Org admins can create invitations for their organization
CREATE POLICY "Org admins can create invitations"
ON public.invitations
FOR INSERT
WITH CHECK (
  is_org_admin(auth.uid(), organization_id)
  OR is_super_admin(auth.uid())
);

-- Policy: Org admins can delete invitations for their organization
CREATE POLICY "Org admins can delete invitations"
ON public.invitations
FOR DELETE
USING (
  is_org_admin(auth.uid(), organization_id)
  OR is_super_admin(auth.uid())
);