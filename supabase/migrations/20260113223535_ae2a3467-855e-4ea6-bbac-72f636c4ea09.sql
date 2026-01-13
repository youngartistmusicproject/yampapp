-- Add completed_by column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN completed_by TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.tasks.completed_by IS 'Username of the person who completed the task';