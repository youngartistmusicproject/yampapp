-- Create conversations table
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create conversation_participants table to track who is in each conversation
CREATE TABLE public.conversation_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_name)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_own BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (but allow public access for now since no auth)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for public access (to be updated when auth is added)
CREATE POLICY "Allow public read access on conversations" 
ON public.conversations FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on conversations" 
ON public.conversations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on conversations" 
ON public.conversations FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on conversation_participants" 
ON public.conversation_participants FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on conversation_participants" 
ON public.conversation_participants FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete access on conversation_participants" 
ON public.conversation_participants FOR DELETE USING (true);

CREATE POLICY "Allow public read access on messages" 
ON public.messages FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on messages" 
ON public.messages FOR INSERT WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_conversations_updated_at();

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Insert sample data
INSERT INTO public.conversations (id, name, type) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Sarah Miller', 'direct'),
  ('22222222-2222-2222-2222-222222222222', 'Faculty Group', 'group'),
  ('33333333-3333-3333-3333-333333333333', 'John Davis', 'direct');

INSERT INTO public.conversation_participants (conversation_id, user_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Sarah Miller'),
  ('11111111-1111-1111-1111-111111111111', 'You'),
  ('22222222-2222-2222-2222-222222222222', 'Sarah'),
  ('22222222-2222-2222-2222-222222222222', 'John'),
  ('22222222-2222-2222-2222-222222222222', 'Emily'),
  ('22222222-2222-2222-2222-222222222222', 'You'),
  ('33333333-3333-3333-3333-333333333333', 'John Davis'),
  ('33333333-3333-3333-3333-333333333333', 'You');

INSERT INTO public.messages (conversation_id, sender_name, content, is_own) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Sarah Miller', 'Hey! Do you have the updated lesson plan for next week?', false),
  ('11111111-1111-1111-1111-111111111111', 'You', 'Yes! Let me share it with you. I have updated the theory section.', true),
  ('11111111-1111-1111-1111-111111111111', 'Sarah Miller', 'Perfect! Can you also include the practice exercises?', false),
  ('11111111-1111-1111-1111-111111111111', 'You', 'Sure thing. I will add those and send the final version.', true),
  ('11111111-1111-1111-1111-111111111111', 'Sarah Miller', 'Thanks for the lesson plan!', false),
  ('22222222-2222-2222-2222-222222222222', 'Sarah', 'Meeting moved to 3pm', false),
  ('33333333-3333-3333-3333-333333333333', 'John Davis', 'Can you cover my class tomorrow?', false);