-- Add role column to project_members to distinguish owners from members
ALTER TABLE public.project_members 
ADD COLUMN role text NOT NULL DEFAULT 'member';

-- Update the unique constraint to allow same user as owner and member (if needed)
-- The existing unique constraint on (project_id, user_name) will remain