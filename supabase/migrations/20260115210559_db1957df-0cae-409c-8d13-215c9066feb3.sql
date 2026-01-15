-- Add new columns to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT;

-- Migrate existing data (split display_name on first space)
UPDATE public.profiles
SET 
  first_name = SPLIT_PART(display_name, ' ', 1),
  last_name = NULLIF(SUBSTRING(display_name FROM POSITION(' ' IN display_name) + 1), '');

-- Make first_name required after migration
ALTER TABLE public.profiles ALTER COLUMN first_name SET NOT NULL;

-- Drop old column
ALTER TABLE public.profiles DROP COLUMN display_name;

-- Update the handle_new_user trigger to use first_name and last_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'last_name',
    NEW.email
  );
  RETURN NEW;
END;
$$;