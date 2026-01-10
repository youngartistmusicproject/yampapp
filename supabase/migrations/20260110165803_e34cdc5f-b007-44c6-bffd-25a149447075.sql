-- Create user presence table
CREATE TABLE public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL UNIQUE,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_online BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth in this app)
CREATE POLICY "Allow all operations on user_presence"
ON public.user_presence
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Create function to mark users as offline if inactive for 2 minutes
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_presence 
  SET is_online = false 
  WHERE last_seen < now() - INTERVAL '2 minutes' AND is_online = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to clean up on every upsert
CREATE TRIGGER cleanup_presence_on_change
AFTER INSERT OR UPDATE ON public.user_presence
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_stale_presence();