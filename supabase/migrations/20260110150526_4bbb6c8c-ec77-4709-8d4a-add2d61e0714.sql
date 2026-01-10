-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT 'You',
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_name, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for public access
CREATE POLICY "Anyone can view message reactions"
ON public.message_reactions FOR SELECT USING (true);

CREATE POLICY "Anyone can add reactions"
ON public.message_reactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can remove reactions"
ON public.message_reactions FOR DELETE USING (true);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;