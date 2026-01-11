-- Add tags column to tasks (as text array)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create task_assignees junction table for multiple assignees
CREATE TABLE IF NOT EXISTS public.task_assignees (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(task_id, user_name)
);

-- Enable RLS
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS policy (permissive for now since no auth)
CREATE POLICY "Allow all on task_assignees" ON public.task_assignees FOR ALL USING (true) WITH CHECK (true);

-- Add color column to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

-- Update existing tasks with tags
UPDATE public.tasks SET tags = ARRAY['planning'] WHERE title LIKE '%lesson plans%';
UPDATE public.tasks SET tags = ARRAY['reports'] WHERE title LIKE '%progress reports%';
UPDATE public.tasks SET tags = ARRAY['communication', 'parents'] WHERE title LIKE '%parent-teacher%';
UPDATE public.tasks SET tags = ARRAY['supplies'] WHERE title LIKE '%music books%';

-- Insert assignees for existing tasks
INSERT INTO public.task_assignees (task_id, user_name)
SELECT id, 'Sarah M.' FROM public.tasks WHERE title LIKE '%lesson plans%';

INSERT INTO public.task_assignees (task_id, user_name)
SELECT id, 'You' FROM public.tasks WHERE title LIKE '%progress reports%';

INSERT INTO public.task_assignees (task_id, user_name)
SELECT id, 'John D.' FROM public.tasks WHERE title LIKE '%parent-teacher%';

INSERT INTO public.task_assignees (task_id, user_name)
SELECT id, 'Admin' FROM public.tasks WHERE title LIKE '%music books%';