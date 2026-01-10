-- Create table to track message reads
CREATE TABLE public.message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_name)
);

-- Enable RLS
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view read receipts
CREATE POLICY "Anyone can view read receipts"
ON public.message_reads
FOR SELECT
USING (true);

-- Allow anyone to mark messages as read
CREATE POLICY "Anyone can mark messages as read"
ON public.message_reads
FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;