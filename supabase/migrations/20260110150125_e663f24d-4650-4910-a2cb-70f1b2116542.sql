-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

-- Create policies for chat attachments bucket
CREATE POLICY "Anyone can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

CREATE POLICY "Anyone can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Anyone can delete own chat attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-attachments');

-- Add attachments column to messages table
ALTER TABLE public.messages ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;