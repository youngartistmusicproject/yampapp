-- Add tags column to projects table for flexible categorization
ALTER TABLE public.projects 
ADD COLUMN tags text[] DEFAULT '{}'::text[];