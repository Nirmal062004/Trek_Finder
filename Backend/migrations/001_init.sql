-- ============================================================================
-- Trek Finder — Single consolidated database migration
-- ============================================================================
-- This migration creates the complete, secure schema for Trek Finder.
-- It replaces all previous migrations (001–006 and secure_rls_policy.sql).
--
-- Features covered:
--   • Profiles (auth users + roles: user / admin / superadmin)
--   • Treks with PostGIS geography (geo-radius search, tags, difficulty, length)
--   • Reviews (1–5 star ratings + comments)
--   • Bookmarks (user saved treks)
--   • Communities (groups, admin-managed)
--   • Channels & Messages (realtime chat)
--   • Stories (user-uploaded trek photos/experiences + storage bucket)
--   • search_treks() RPC (geo-radius + text + rating + difficulty + tags)
--   • Row Level Security (RLS) on every table
--   • is_admin() SECURITY DEFINER helper
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 2. Profiles (extends Supabase Auth users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. Treks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.treks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  geom geography(Point,4326) NOT NULL,
  difficulty smallint CHECK (difficulty >= 1 AND difficulty <= 3),
  length_km numeric CHECK (length_km >= 0),
  tags text[] DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. Reviews
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trek_id uuid NOT NULL REFERENCES public.treks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating smallint CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. Bookmarks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trek_id uuid NOT NULL REFERENCES public.treks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (trek_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 6. Communities
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon_key text DEFAULT 'globe',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7. Channels (chat rooms)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  is_public boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 8. Messages (realtime chat)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 9. Stories (user-uploaded trek photos / experiences)
-- ---------------------------------------------------------------------------
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
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name text,
  user_email text,
  storage_path text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 10. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS treks_geom_gist_idx ON public.treks USING GIST(geom);
CREATE INDEX IF NOT EXISTS treks_tags_gin_idx ON public.treks USING GIN(tags);
CREATE INDEX IF NOT EXISTS treks_difficulty_idx ON public.treks(difficulty);
CREATE INDEX IF NOT EXISTS treks_length_idx ON public.treks(length_km);
CREATE INDEX IF NOT EXISTS treks_created_by_idx ON public.treks(created_by);
CREATE INDEX IF NOT EXISTS treks_is_published_idx ON public.treks(is_published);
CREATE INDEX IF NOT EXISTS reviews_trek_idx ON public.reviews(trek_id);
CREATE INDEX IF NOT EXISTS reviews_user_idx ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS bookmarks_trek_idx ON public.bookmarks(trek_id);
CREATE INDEX IF NOT EXISTS bookmarks_user_idx ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS channels_created_by_idx ON public.channels(created_by);
CREATE INDEX IF NOT EXISTS messages_channel_idx ON public.messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_user_idx ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS communities_created_by_idx ON public.communities(created_by);
CREATE INDEX IF NOT EXISTS stories_state_idx ON public.stories(state);
CREATE INDEX IF NOT EXISTS stories_district_idx ON public.stories(district);
CREATE INDEX IF NOT EXISTS stories_user_id_idx ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS stories_created_at_idx ON public.stories(created_at DESC);

-- ---------------------------------------------------------------------------
-- 11. Helper: is_admin() (SECURITY DEFINER to avoid RLS recursion)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND (role = 'admin' OR role = 'superadmin')
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 12. Row Level Security — enable on all tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 13. Profiles policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage any profile"
ON public.profiles FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 14. Treks policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Treks are viewable by everyone"
ON public.treks FOR SELECT
USING (is_published OR auth.uid() = created_by OR public.is_admin());

CREATE POLICY "Authenticated users can insert treks"
ON public.treks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update treks"
ON public.treks FOR UPDATE
USING (auth.uid() = created_by OR public.is_admin())
WITH CHECK (auth.uid() = created_by OR public.is_admin());

CREATE POLICY "Owners and admins can delete treks"
ON public.treks FOR DELETE
USING (auth.uid() = created_by OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 15. Reviews policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Reviews are viewable by everyone"
ON public.reviews FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners and admins can update reviews"
ON public.reviews FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Owners and admins can delete reviews"
ON public.reviews FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 16. Bookmarks policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Bookmarks are viewable by owner"
ON public.bookmarks FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Authenticated users can insert bookmarks"
ON public.bookmarks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners and admins can delete bookmarks"
ON public.bookmarks FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 17. Communities policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Communities are viewable by everyone"
ON public.communities FOR SELECT
USING (is_public OR auth.uid() = created_by OR public.is_admin());

CREATE POLICY "Authenticated users can insert communities"
ON public.communities FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update communities"
ON public.communities FOR UPDATE
USING (auth.uid() = created_by OR public.is_admin())
WITH CHECK (auth.uid() = created_by OR public.is_admin());

CREATE POLICY "Owners and admins can delete communities"
ON public.communities FOR DELETE
USING (auth.uid() = created_by OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 18. Channels policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Channels are viewable by everyone"
ON public.channels FOR SELECT
USING (is_public OR auth.uid() = created_by OR public.is_admin());

CREATE POLICY "Authenticated users can insert channels"
ON public.channels FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update channels"
ON public.channels FOR UPDATE
USING (auth.uid() = created_by OR public.is_admin())
WITH CHECK (auth.uid() = created_by OR public.is_admin());

CREATE POLICY "Owners and admins can delete channels"
ON public.channels FOR DELETE
USING (auth.uid() = created_by OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 19. Messages policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Messages in public channels are viewable by everyone"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = messages.channel_id
      AND (c.is_public OR c.created_by = auth.uid() OR public.is_admin())
  )
);

CREATE POLICY "Authenticated users can insert messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners and admins can update messages"
ON public.messages FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Owners and admins can delete messages"
ON public.messages FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 20. Stories policies
-- ---------------------------------------------------------------------------
CREATE POLICY "Stories are viewable by everyone"
ON public.stories FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert stories"
ON public.stories FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners and admins can update stories"
ON public.stories FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Owners and admins can delete stories"
ON public.stories FOR DELETE
USING (auth.uid() = user_id OR public.is_admin());

-- ---------------------------------------------------------------------------
-- 21. spatial_ref_sys — read-only for PostGIS queries
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access on spatial_ref_sys" ON public.spatial_ref_sys;
CREATE POLICY "Allow public read access on spatial_ref_sys"
ON public.spatial_ref_sys
FOR SELECT
TO public
USING (true);

-- ---------------------------------------------------------------------------
-- 22. RPC: search_treks — geo-radius search with filters
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_treks(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision DEFAULT 5000,
  p_min_rating integer DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_difficulty smallint DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
) RETURNS TABLE (
  id uuid,
  title text,
  description text,
  distance_m double precision,
  difficulty smallint,
  length_km numeric,
  created_by uuid,
  tags text[],
  lat double precision,
  lng double precision,
  avg_rating double precision
) LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    ST_Distance(t.geom, ST_MakePoint(p_lng, p_lat)::geography) AS distance_m,
    t.difficulty,
    t.length_km,
    t.created_by,
    t.tags,
    ST_Y(t.geom::geometry) AS lat,
    ST_X(t.geom::geometry) AS lng,
    COALESCE((
      SELECT AVG(r.rating)::double precision
      FROM public.reviews r
      WHERE r.trek_id = t.id
    ), 0) AS avg_rating
  FROM public.treks t
  WHERE ST_DWithin(t.geom, ST_MakePoint(p_lng, p_lat)::geography, p_radius_m)
    AND (p_difficulty IS NULL OR t.difficulty = p_difficulty)
    AND (
      p_tags IS NULL
      OR array_length(p_tags, 1) IS NULL
      OR t.title ILIKE ANY(p_tags)
      OR t.description ILIKE ANY(p_tags)
      OR t.tags && p_tags
    )
    AND (p_min_rating IS NULL OR (
      SELECT COALESCE(AVG(r.rating), 0)
      FROM public.reviews r
      WHERE r.trek_id = t.id
    ) >= p_min_rating)
    AND (t.is_published OR auth.uid() = t.created_by OR public.is_admin())
  ORDER BY distance_m
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ---------------------------------------------------------------------------
-- 23. Storage bucket: trek-images (for story media)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('trek-images', 'trek-images', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

DROP POLICY IF EXISTS "Public Access to Trek Images" ON storage.objects;
CREATE POLICY "Public Access to Trek Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'trek-images');

DROP POLICY IF EXISTS "Authenticated Users Can Upload" ON storage.objects;
CREATE POLICY "Authenticated Users Can Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'trek-images');

DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'trek-images' AND owner = auth.uid());

DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'trek-images' AND owner = auth.uid());

-- ============================================================================
-- End of migration
-- ============================================================================
