-- Add sort_order column to tasks table for manual sorting
ALTER TABLE public.tasks ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Set initial sort_order based on created_at
UPDATE public.tasks 
SET sort_order = subq.row_num 
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num 
  FROM public.tasks
) as subq 
WHERE public.tasks.id = subq.id;