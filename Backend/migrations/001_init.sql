-- Supabase/PostGIS schema for Trekk Finder
-- Enables PostGIS and creates tables, indexes and RLS policies

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Treks: basic POIs or route start point stored as a geography point
CREATE TABLE IF NOT EXISTS treks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  geom geography(Point,4326) NOT NULL,
  difficulty smallint,
  length_km numeric,
  tags text[] DEFAULT '{}',
  created_by uuid NOT NULL,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trek_id uuid NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating smallint CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trek_id uuid NOT NULL REFERENCES treks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (trek_id, user_id)
);

-- Chat channels and messages (Realtime will stream inserts)
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  is_public boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for fast geo queries and filters
CREATE INDEX IF NOT EXISTS treks_geom_gist_idx ON treks USING GIST(geom);
CREATE INDEX IF NOT EXISTS treks_tags_gin_idx ON treks USING GIN(tags);
CREATE INDEX IF NOT EXISTS treks_difficulty_idx ON treks(difficulty);
CREATE INDEX IF NOT EXISTS treks_length_idx ON treks(length_km);
CREATE INDEX IF NOT EXISTS reviews_trek_idx ON reviews(trek_id);
CREATE INDEX IF NOT EXISTS messages_channel_idx ON messages(channel_id, created_at DESC);

-- Row Level Security: strict by-default policies
ALTER TABLE treks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- treks policies
CREATE POLICY "treks_select_published_or_owner" ON treks
  FOR SELECT USING (is_published OR auth.uid() = created_by);

CREATE POLICY "treks_insert_auth" ON treks
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "treks_modify_owner" ON treks
  FOR UPDATE, DELETE USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- reviews policies
CREATE POLICY "reviews_select_public" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_auth" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_user_modify" ON reviews
  FOR UPDATE, DELETE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- bookmarks policies: only owner can read their bookmarks
CREATE POLICY "bookmarks_owner_read" ON bookmarks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "bookmarks_insert_auth" ON bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookmarks_delete_owner" ON bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- channels/messages: public channels readable; messages insert limited to auth users
CREATE POLICY "channels_select_public_or_owner" ON channels
  FOR SELECT USING (is_public OR auth.uid() = created_by);

CREATE POLICY "channels_insert_auth" ON channels
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "messages_select_channel_public" ON messages
  FOR SELECT USING (EXISTS (SELECT 1 FROM channels c WHERE c.id = messages.channel_id AND c.is_public) OR auth.role() = 'supabase_admin');

CREATE POLICY "messages_insert_auth" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- RPC: geo-radius search with optional filters
CREATE OR REPLACE FUNCTION public.search_treks(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision,
  p_min_rating integer DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_difficulty integer DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
) RETURNS TABLE(
  id uuid,
  title text,
  description text,
  distance_m double precision,
  difficulty smallint,
  length_km numeric,
  created_by uuid,
  tags text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.title, t.description,
    ST_Distance(t.geom, ST_MakePoint(p_lng, p_lat)::geography) AS distance_m,
    t.difficulty, t.length_km, t.created_by, t.tags
  FROM treks t
  WHERE ST_DWithin(t.geom, ST_MakePoint(p_lng, p_lat)::geography, p_radius_m)
    AND (p_difficulty IS NULL OR t.difficulty = p_difficulty)
    AND (p_tags IS NULL OR array_length(p_tags,1) IS NULL OR t.tags && p_tags)
    AND (p_min_rating IS NULL OR (
       SELECT COALESCE(AVG(r.rating),0) FROM reviews r WHERE r.trek_id = t.id
    ) >= p_min_rating)
  ORDER BY distance_m
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
