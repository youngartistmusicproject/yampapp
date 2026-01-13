-- Add recurrence settings columns to tasks table
ALTER TABLE public.tasks
ADD COLUMN recurrence_frequency text,
ADD COLUMN recurrence_interval integer DEFAULT 1,
ADD COLUMN recurrence_end_date date,
ADD COLUMN recurrence_days_of_week integer[],
ADD COLUMN recurrence_day_of_month integer,
ADD COLUMN parent_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
ADD COLUMN recurrence_index integer DEFAULT 0;

-- Create index for efficient lookup of task instances
CREATE INDEX idx_tasks_parent_task_id ON public.tasks(parent_task_id) WHERE parent_task_id IS NOT NULL;