-- Add color column to teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS color text DEFAULT '#6366f1';