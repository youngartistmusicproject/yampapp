-- Add sort_order column to teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Initialize sort_order based on current name order
WITH ranked_teams AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) as rn
  FROM public.teams
)
UPDATE public.teams t
SET sort_order = rt.rn
FROM ranked_teams rt
WHERE t.id = rt.id;