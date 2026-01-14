-- Add area_id column to projects table (required)
ALTER TABLE public.projects 
ADD COLUMN area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_projects_area_id ON public.projects(area_id);