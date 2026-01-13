-- Add archived_at column to tasks table for archiving completed tasks
ALTER TABLE public.tasks 
ADD COLUMN archived_at TIMESTAMPTZ NULL;

-- Add an index for efficient querying of archived tasks
CREATE INDEX idx_tasks_archived_at ON public.tasks (archived_at) WHERE archived_at IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.tasks.archived_at IS 'Timestamp when the task was archived. Archived tasks are hidden from the main completed list.';