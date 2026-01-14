-- Change from single area_id to multiple area_ids array
ALTER TABLE public.projects 
DROP COLUMN IF EXISTS area_id;

ALTER TABLE public.projects 
ADD COLUMN area_ids uuid[] DEFAULT '{}'::uuid[];