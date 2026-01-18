-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for authenticated users to upload files to task-attachments
CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

-- Create policy for anyone to view task attachments (public bucket)
CREATE POLICY "Anyone can view task attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'task-attachments');

-- Create policy for authenticated users to delete their own uploads
CREATE POLICY "Users can delete their own task attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-attachments');

-- Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  parent_comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_comment_attachments table
CREATE TABLE IF NOT EXISTS public.task_comment_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.task_comments(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  url TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_attachments table (direct task attachments, not via comments)
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER NOT NULL,
  url TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comment_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_comments
CREATE POLICY "Users can view task comments in their organization"
ON public.task_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
    AND (
      t.organization_id IS NULL 
      OR t.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Authenticated users can create comments"
ON public.task_comments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own comments"
ON public.task_comments FOR UPDATE
TO authenticated
USING (author_name = (SELECT first_name || ' ' || COALESCE(last_name, '') FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their own comments"
ON public.task_comments FOR DELETE
TO authenticated
USING (author_name = (SELECT first_name || ' ' || COALESCE(last_name, '') FROM public.profiles WHERE id = auth.uid()));

-- RLS policies for task_comment_attachments
CREATE POLICY "Users can view comment attachments in their organization"
ON public.task_comment_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comment_attachments.task_id
    AND (
      t.organization_id IS NULL 
      OR t.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Authenticated users can create comment attachments"
ON public.task_comment_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can delete their own comment attachments"
ON public.task_comment_attachments FOR DELETE
TO authenticated
USING (uploaded_by = (SELECT first_name || ' ' || COALESCE(last_name, '') FROM public.profiles WHERE id = auth.uid()));

-- RLS policies for task_attachments
CREATE POLICY "Users can view task attachments in their organization"
ON public.task_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_attachments.task_id
    AND (
      t.organization_id IS NULL 
      OR t.organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Authenticated users can create task attachments"
ON public.task_attachments FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can delete their own task attachments"
ON public.task_attachments FOR DELETE
TO authenticated
USING (uploaded_by = (SELECT first_name || ' ' || COALESCE(last_name, '') FROM public.profiles WHERE id = auth.uid()));