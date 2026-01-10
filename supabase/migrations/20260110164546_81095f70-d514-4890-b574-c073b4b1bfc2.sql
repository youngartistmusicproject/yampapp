-- Create typing indicators table
CREATE TABLE public.typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_name)
);

-- Enable RLS
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (no auth)
CREATE POLICY "Allow all operations on typing_indicators"
ON public.typing_indicators
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime for typing indicators
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;

-- Create function to clean up stale typing indicators (older than 5 seconds)
CREATE OR REPLACE FUNCTION public.cleanup_stale_typing_indicators()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.typing_indicators 
  WHERE updated_at < now() - INTERVAL '5 seconds';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to clean up on every insert/update
CREATE TRIGGER cleanup_typing_on_change
AFTER INSERT OR UPDATE ON public.typing_indicators
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_stale_typing_indicators();