-- Fix pre-existing conversation_participants RLS policies
DROP POLICY IF EXISTS "Allow adding participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow removing participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Allow viewing participants" ON public.conversation_participants;

-- Only participants of the conversation or org members can view
CREATE POLICY "Participants can view conversation members"
ON public.conversation_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = conversation_participants.conversation_id
    AND cp2.user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  )
);

-- Users can add participants to conversations they're in
CREATE POLICY "Participants can add members"
ON public.conversation_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp2
    WHERE cp2.conversation_id = conversation_participants.conversation_id
    AND cp2.user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  ) OR
  -- Allow creating first participant (the creator)
  user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);

-- Users can remove themselves or admins can remove others
CREATE POLICY "Users can leave or admins can remove"
ON public.conversation_participants FOR DELETE
USING (
  user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid()) OR
  public.is_admin(auth.uid())
);

-- Phase 5: Create default organization and migrate existing data
-- Create default organization for existing data
INSERT INTO public.organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default')
ON CONFLICT (slug) DO NOTHING;

-- Migrate existing users to default organization with their current roles
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  user_id,
  role
FROM public.user_roles
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Update existing data with default organization_id
UPDATE public.projects SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.areas SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.knowledge_documents SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.conversations SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.community_groups SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE public.activity_log SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Add organization_id to profiles for quick access to primary org
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_organization_id UUID REFERENCES public.organizations(id);

-- Set default org as primary for existing users
UPDATE public.profiles SET primary_organization_id = '00000000-0000-0000-0000-000000000001' WHERE primary_organization_id IS NULL;