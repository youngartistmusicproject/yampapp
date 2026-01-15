-- Add organization_id to notifications table
ALTER TABLE public.notifications 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- Migrate existing notifications to Default Organization
UPDATE public.notifications 
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'default-organization' LIMIT 1)
WHERE organization_id IS NULL;

-- Create index for organization_id on notifications
CREATE INDEX idx_notifications_organization_id ON public.notifications(organization_id);

-- Drop existing RLS policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;

-- Create new organization-scoped RLS policies for notifications
CREATE POLICY "Users can view own org notifications"
ON public.notifications FOR SELECT
USING (
  auth.uid() = user_id 
  AND (organization_id IS NULL OR organization_id = ANY(get_user_organization_ids(auth.uid())))
);

CREATE POLICY "Users can update own org notifications"
ON public.notifications FOR UPDATE
USING (
  auth.uid() = user_id 
  AND (organization_id IS NULL OR organization_id = ANY(get_user_organization_ids(auth.uid())))
)
WITH CHECK (
  auth.uid() = user_id 
  AND (organization_id IS NULL OR organization_id = ANY(get_user_organization_ids(auth.uid())))
);

CREATE POLICY "Users can delete own org notifications"
ON public.notifications FOR DELETE
USING (
  auth.uid() = user_id 
  AND (organization_id IS NULL OR organization_id = ANY(get_user_organization_ids(auth.uid())))
);

CREATE POLICY "Authenticated users can create org notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (organization_id IS NULL OR organization_id = ANY(get_user_organization_ids(auth.uid())))
);

-- Fix community_post_likes RLS - scope to organization via post's group
DROP POLICY IF EXISTS "Anyone can view post likes" ON public.community_post_likes;

CREATE POLICY "Users can view org post likes"
ON public.community_post_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_posts cp
    JOIN public.community_groups cg ON cg.id = cp.group_id
    WHERE cp.id = community_post_likes.post_id
    AND (cg.organization_id IS NULL OR cg.organization_id = ANY(get_user_organization_ids(auth.uid())))
  )
);

-- Fix community_comment_likes RLS - scope to organization via comment's post's group
DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.community_comment_likes;

CREATE POLICY "Users can view org comment likes"
ON public.community_comment_likes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_comments cc
    JOIN public.community_posts cp ON cp.id = cc.post_id
    JOIN public.community_groups cg ON cg.id = cp.group_id
    WHERE cc.id = community_comment_likes.comment_id
    AND (cg.organization_id IS NULL OR cg.organization_id = ANY(get_user_organization_ids(auth.uid())))
  )
);