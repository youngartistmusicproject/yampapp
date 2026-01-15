-- Fix recursive trigger in cleanup_stale_presence function
-- The function was causing "stack depth limit exceeded" errors because:
-- 1. Trigger fires on INSERT/UPDATE of user_presence
-- 2. Function performs UPDATE on user_presence
-- 3. That UPDATE fires the trigger again, causing infinite recursion

-- Replace the function with a version that checks trigger depth to prevent recursion
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only run cleanup if we're not already in a nested trigger context
  -- This prevents infinite recursion when the UPDATE fires the trigger again
  -- pg_trigger_depth() returns 1 for the original trigger, 2+ for nested calls
  IF pg_trigger_depth() <= 1 THEN
    UPDATE public.user_presence 
    SET is_online = false 
    WHERE last_seen < now() - INTERVAL '2 minutes' AND is_online = true;
  END IF;
  RETURN NEW;
END;
$$;