-- Ensure trek-images bucket is public and accessible

-- 1. Create the bucket if it doesn't exist (and ensure it's public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('trek-images', 'trek-images', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- 2. Create a policy to allow public read access to all files in the bucket
-- First, drop existing policy to avoid conflicts
DROP POLICY IF EXISTS "Public Access to Trek Images" ON storage.objects;

-- Create the policy
CREATE POLICY "Public Access to Trek Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'trek-images' );

-- 3. Ensure authenticated users can upload (INSERT)
DROP POLICY IF EXISTS "Authenticated Users Can Upload" ON storage.objects;

CREATE POLICY "Authenticated Users Can Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'trek-images' );

-- 4. Ensure users can update/delete their own files (optional specific policy for user folders)
-- This assumes standard RLS where users can manage their own uploaded files
-- A separate policy might be needed if you want strict ownership checks matching the path
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;

CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'trek-images' AND owner = auth.uid() );

DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'trek-images' AND owner = auth.uid() );
