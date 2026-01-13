-- Add how_to_link column to tasks table for SOP documentation links
ALTER TABLE public.tasks 
ADD COLUMN how_to_link TEXT;