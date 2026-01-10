-- Community Groups table
CREATE TABLE public.community_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL DEFAULT 'Admin'
);

-- Community Posts table
CREATE TABLE public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT DEFAULT 'Member',
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Community Comments table
CREATE TABLE public.community_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Community Post Likes table
CREATE TABLE public.community_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_name)
);

-- Community Comment Likes table
CREATE TABLE public.community_comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_name)
);

-- Group Members table
CREATE TABLE public.community_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_name)
);

-- Enable RLS on all tables
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_group_members ENABLE ROW LEVEL SECURITY;

-- Permissive RLS policies (will be secured when auth is added)
CREATE POLICY "Allow all on community_groups" ON public.community_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on community_posts" ON public.community_posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on community_comments" ON public.community_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on community_post_likes" ON public.community_post_likes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on community_comment_likes" ON public.community_comment_likes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on community_group_members" ON public.community_group_members FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for posts and comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_post_likes;

-- Seed initial groups
INSERT INTO public.community_groups (name, description) VALUES
  ('Faculty Lounge', 'General discussion for all faculty members'),
  ('Music Theory', 'Share resources and discuss theory concepts'),
  ('Parent Community', 'Connect with other music school parents'),
  ('Student Showcase', 'Share student achievements and performances');

-- Add default members to groups
INSERT INTO public.community_group_members (group_id, user_name)
SELECT id, 'You' FROM public.community_groups;