-- Add sort_order column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Initialize sort_order based on current name order within each team
WITH ranked_projects AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY name) as rn
  FROM public.projects
)
UPDATE public.projects p
SET sort_order = rp.rn
FROM ranked_projects rp
WHERE p.id = rp.id;