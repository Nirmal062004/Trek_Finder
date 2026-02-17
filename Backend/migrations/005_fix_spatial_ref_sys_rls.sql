-- Fix RLS warning for PostGIS spatial_ref_sys table

-- 1. Enable Row Level Security
ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- 2. Allow public read access (essential for spatial queries to work)
DROP POLICY IF EXISTS "Allow public read access on spatial_ref_sys" ON public.spatial_ref_sys;

CREATE POLICY "Allow public read access on spatial_ref_sys"
ON public.spatial_ref_sys
FOR SELECT
TO public
USING (true);

-- 3. (Optional) Block all writes from API if not already restricted by ownership
-- RLS by default denies all actions not explicitly allowed, so just enabling it 
-- without an INSERT/UPDATE/DELETE policy effectively makes it read-only for API users.
