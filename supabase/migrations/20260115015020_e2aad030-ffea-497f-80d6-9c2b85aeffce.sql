-- Add subtasks JSONB column to tasks table for storing subtask data
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;