-- Create team_members table to track team membership
CREATE TABLE public.team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_name text NOT NULL,
    role text DEFAULT 'member',
    joined_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (team_id, user_name)
);

-- Enable Row Level Security
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Create policy for team members (permissive for now since no auth)
CREATE POLICY "Allow all on team_members"
ON public.team_members
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_name ON public.team_members(user_name);