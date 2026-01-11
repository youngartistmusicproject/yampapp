-- Add effort and importance columns to tasks table
ALTER TABLE public.tasks ADD COLUMN effort TEXT DEFAULT 'easy';
ALTER TABLE public.tasks ADD COLUMN importance TEXT DEFAULT 'routine';

-- Migrate existing priority data to effort/importance
UPDATE public.tasks 
SET 
  effort = CASE 
    WHEN priority = 'low' THEN 'easy'
    WHEN priority = 'medium' THEN 'light'
    WHEN priority = 'high' THEN 'focused'
    WHEN priority = 'urgent' THEN 'deep'
    ELSE 'easy'
  END,
  importance = CASE 
    WHEN priority = 'low' THEN 'low'
    WHEN priority = 'medium' THEN 'routine'
    WHEN priority = 'high' THEN 'important'
    WHEN priority = 'urgent' THEN 'critical'
    ELSE 'routine'
  END;