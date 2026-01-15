-- ============================================
-- FIX 1: Community Tables RLS Policies
-- Replace overly permissive "Allow all" policies with proper owner-based policies
-- ============================================

-- Drop existing overly permissive policies on community tables
DROP POLICY IF EXISTS "Allow all on community_groups" ON public.community_groups;
DROP POLICY IF EXISTS "Allow all on community_posts" ON public.community_posts;
DROP POLICY IF EXISTS "Allow all on community_comments" ON public.community_comments;
DROP POLICY IF EXISTS "Allow all on community_post_likes" ON public.community_post_likes;
DROP POLICY IF EXISTS "Allow all on community_comment_likes" ON public.community_comment_likes;
DROP POLICY IF EXISTS "Allow all on community_group_members" ON public.community_group_members;

-- ============================================
-- COMMUNITY_GROUPS - Admins manage, all can view
-- ============================================
CREATE POLICY "Anyone can view community groups"
ON public.community_groups FOR SELECT
USING (true);

CREATE POLICY "Admins can create community groups"
ON public.community_groups FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update community groups"
ON public.community_groups FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete community groups"
ON public.community_groups FOR DELETE
USING (is_admin(auth.uid()));

-- ============================================
-- COMMUNITY_POSTS - Users own their posts
-- ============================================
CREATE POLICY "Anyone can view community posts"
ON public.community_posts FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create posts"
ON public.community_posts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own posts"
ON public.community_posts FOR UPDATE
USING (
  author_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  author_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete own posts or admins moderate"
ON public.community_posts FOR DELETE
USING (
  author_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  OR is_admin(auth.uid())
);

-- ============================================
-- COMMUNITY_COMMENTS - Users own their comments
-- ============================================
CREATE POLICY "Anyone can view community comments"
ON public.community_comments FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create comments"
ON public.community_comments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own comments"
ON public.community_comments FOR UPDATE
USING (
  author_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  author_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete own comments or admins moderate"
ON public.community_comments FOR DELETE
USING (
  author_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  OR is_admin(auth.uid())
);

-- ============================================
-- COMMUNITY_POST_LIKES - Users own their likes
-- ============================================
CREATE POLICY "Anyone can view post likes"
ON public.community_post_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can add post likes"
ON public.community_post_likes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can remove own post likes"
ON public.community_post_likes FOR DELETE
USING (
  user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);

-- ============================================
-- COMMUNITY_COMMENT_LIKES - Users own their likes
-- ============================================
CREATE POLICY "Anyone can view comment likes"
ON public.community_comment_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can add comment likes"
ON public.community_comment_likes FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can remove own comment likes"
ON public.community_comment_likes FOR DELETE
USING (
  user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
);

-- ============================================
-- COMMUNITY_GROUP_MEMBERS - Users can join/leave, admins manage all
-- ============================================
CREATE POLICY "Anyone can view group members"
ON public.community_group_members FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can join groups"
ON public.community_group_members FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can leave groups or admins manage"
ON public.community_group_members FOR DELETE
USING (
  user_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid())
  OR is_admin(auth.uid())
);

-- ============================================
-- FIX 2: Chat Attachments Storage Security
-- Make bucket private and update policies
-- ============================================

-- Update bucket to private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- Drop existing overly permissive storage policies
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete own chat attachments" ON storage.objects;

-- Create secure storage policies
-- Authenticated users can upload attachments
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid() IS NOT NULL
);

-- Authenticated users can view attachments (they must be logged in)
CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid() IS NOT NULL
);

-- Users can delete their own uploads (using owner field)
CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments' AND
  owner = auth.uid()
);