-- Create areas table for storing department/category tags
CREATE TABLE public.areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth in this app currently)
CREATE POLICY "Allow all on areas" ON public.areas
FOR ALL USING (true) WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_areas_updated_at
BEFORE UPDATE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default areas from the static config
INSERT INTO public.areas (name, color, sort_order) VALUES
  ('Operations', '#3b82f6', 0),
  ('Finance', '#10b981', 1),
  ('Marketing', '#f59e0b', 2),
  ('HR', '#8b5cf6', 3),
  ('Product', '#ec4899', 4);