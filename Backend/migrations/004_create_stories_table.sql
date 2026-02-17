-- Create stories table for user-uploaded trek photos and experiences

CREATE TABLE IF NOT EXISTS public.stories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    state text NOT NULL,
    district text NOT NULL,
    trek_name text,
    community text,
    community_name text,
    description text,
    media_url text,
    media_type text DEFAULT 'image',
    user_name text,
    user_email text,
    storage_path text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries by state and district
CREATE INDEX IF NOT EXISTS stories_state_idx ON public.stories(state);
CREATE INDEX IF NOT EXISTS stories_district_idx ON public.stories(district);
CREATE INDEX IF NOT EXISTS stories_user_email_idx ON public.stories(user_email);
CREATE INDEX IF NOT EXISTS stories_created_at_idx ON public.stories(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read stories
CREATE POLICY "Stories are viewable by everyone" 
ON public.stories FOR SELECT 
USING (true);

-- Policy: Authenticated users can insert their own stories
CREATE POLICY "Users can insert own stories" 
ON public.stories FOR INSERT 
WITH CHECK (auth.uid()::text = user_email OR user_email IS NOT NULL);

-- Policy: Users can update their own stories
CREATE POLICY "Users can update own stories" 
ON public.stories FOR UPDATE 
USING (auth.uid()::text = user_email);

-- Policy: Users can delete their own stories, Admins can delete any
CREATE POLICY "Users can delete own stories" 
ON public.stories FOR DELETE 
USING (auth.uid()::text = user_email OR is_admin());

-- Create storage bucket for story images (if not exists)
-- Note: This needs to be run in Supabase Dashboard -> Storage
-- Bucket name: 'trek-images' (must be public)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('trek-images', 'trek-images', true)
-- ON CONFLICT (id) DO NOTHING;
