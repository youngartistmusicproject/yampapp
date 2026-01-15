-- =====================================================
-- SECURITY FIX: Enforce Authenticated User Identity
-- Prevents client-side identity spoofing via triggers
-- =====================================================

-- Create trigger function to set sender/user based on auth.uid()
CREATE OR REPLACE FUNCTION public.set_authenticated_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Override any client-supplied user_name/sender_name with authenticated user
  IF TG_TABLE_NAME = 'messages' THEN
    NEW.sender_name := (SELECT first_name FROM public.profiles WHERE id = auth.uid());
  ELSIF TG_TABLE_NAME = 'activity_log' THEN
    NEW.user_name := (SELECT first_name FROM public.profiles WHERE id = auth.uid());
  ELSIF TG_TABLE_NAME = 'message_reactions' THEN
    NEW.user_name := (SELECT first_name FROM public.profiles WHERE id = auth.uid());
  ELSIF TG_TABLE_NAME = 'typing_indicators' THEN
    NEW.user_name := (SELECT first_name FROM public.profiles WHERE id = auth.uid());
  ELSIF TG_TABLE_NAME = 'user_presence' THEN
    NEW.user_name := (SELECT first_name FROM public.profiles WHERE id = auth.uid());
  ELSIF TG_TABLE_NAME = 'community_posts' THEN
    NEW.author_name := (SELECT first_name FROM public.profiles WHERE id = auth.uid());
  ELSIF TG_TABLE_NAME = 'community_comments' THEN
    NEW.author_name := (SELECT first_name FROM public.profiles WHERE id = auth.uid());
  ELSIF TG_TABLE_NAME = 'community_post_likes' THEN
    NEW.user_name := (SELECT first_name FROM public.profiles WHERE id = auth.uid());
  ELSIF TG_TABLE_NAME = 'community_comment_likes' THEN
    NEW.user_name := (SELECT first_name FROM public.profiles WHERE id = auth.uid());
  ELSIF TG_TABLE_NAME = 'community_group_members' THEN
    NEW.user_name := (SELECT first_name FROM public.profiles WHERE id = auth.uid());
  ELSIF TG_TABLE_NAME = 'message_reads' THEN
    NEW.user_name := (SELECT first_name FROM public.profiles WHERE id = auth.uid());
  ELSIF TG_TABLE_NAME = 'conversation_participants' THEN
    -- Don't override for conversation_participants as it may be setting other users
    NULL;
  ELSE
    NEW.user_name := (SELECT first_name FROM public.profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply triggers to enforce authenticated user identity

-- Messages: enforce sender_name
CREATE TRIGGER enforce_messages_sender
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_user();

-- Activity log: enforce user_name  
CREATE TRIGGER enforce_activity_user
  BEFORE INSERT ON public.activity_log
  FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_user();

-- Message reactions: enforce user_name
CREATE TRIGGER enforce_reactions_user
  BEFORE INSERT ON public.message_reactions
  FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_user();

-- Typing indicators: enforce user_name
CREATE TRIGGER enforce_typing_user
  BEFORE INSERT ON public.typing_indicators
  FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_user();

-- User presence: enforce user_name  
CREATE TRIGGER enforce_presence_user
  BEFORE INSERT ON public.user_presence
  FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_user();

-- Community posts: enforce author_name
CREATE TRIGGER enforce_posts_author
  BEFORE INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_user();

-- Community comments: enforce author_name
CREATE TRIGGER enforce_comments_author
  BEFORE INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_user();

-- Community post likes: enforce user_name
CREATE TRIGGER enforce_post_likes_user
  BEFORE INSERT ON public.community_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_user();

-- Community comment likes: enforce user_name
CREATE TRIGGER enforce_comment_likes_user
  BEFORE INSERT ON public.community_comment_likes
  FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_user();

-- Community group members: enforce user_name
CREATE TRIGGER enforce_group_members_user
  BEFORE INSERT ON public.community_group_members
  FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_user();

-- Message reads: enforce user_name
CREATE TRIGGER enforce_message_reads_user
  BEFORE INSERT ON public.message_reads
  FOR EACH ROW EXECUTE FUNCTION public.set_authenticated_user();