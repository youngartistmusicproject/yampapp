-- Remove team_id foreign key constraint and column from projects
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_team_id_fkey;
ALTER TABLE public.projects DROP COLUMN IF EXISTS team_id;

-- Drop team_members table
DROP TABLE IF EXISTS public.team_members;

-- Drop teams table
DROP TABLE IF EXISTS public.teams;