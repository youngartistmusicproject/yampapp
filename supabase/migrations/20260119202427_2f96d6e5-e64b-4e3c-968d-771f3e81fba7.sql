-- Add branding columns to organizations table for whitelabeling
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS app_name TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS favicon_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.organizations.app_name IS 'Custom app name for whitelabeling (e.g., "Staff Portal")';
COMMENT ON COLUMN public.organizations.primary_color IS 'Hex color for primary branding (default: Indigo #6366f1)';
COMMENT ON COLUMN public.organizations.favicon_url IS 'Custom favicon URL';