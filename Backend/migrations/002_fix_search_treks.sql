-- Migration 002: Fix search_treks RPC to return coordinates and support text search
-- This updates the existing search_treks function to be more useful for the frontend map.

-- First, drop the old function to avoid signature conflicts if possible, or just replace.
-- Since we are changing return columns, we should drop it first or use param names to overloading.
-- Safest is DROP then CREATE.

DROP FUNCTION IF EXISTS public.search_treks(double precision, double precision, double precision, integer, text[], integer, integer, integer);

CREATE OR REPLACE FUNCTION public.search_treks(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision,
  p_min_rating integer DEFAULT NULL,
  p_difficulty integer DEFAULT NULL,
  p_tags text[] DEFAULT NULL, -- kept for backward compat if any, but logic below uses it for name search
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
  tags text[],
  lat double precision, -- NEW
  lng double precision  -- NEW
) AS $$
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
    ST_Y(t.geom::geometry) as lat,
    ST_X(t.geom::geometry) as lng
  FROM treks t
  WHERE ST_DWithin(t.geom, ST_MakePoint(p_lng, p_lat)::geography, p_radius_m)
    AND (p_difficulty IS NULL OR t.difficulty = p_difficulty)
    -- Improved Text Search on Title/Description/Tags
    AND (
        p_tags IS NULL 
        OR array_length(p_tags, 1) IS NULL 
        OR t.title ILIKE ANY(p_tags) 
        OR t.description ILIKE ANY(p_tags)
        OR t.tags && p_tags
    )
    AND (p_min_rating IS NULL OR (
       SELECT COALESCE(AVG(r.rating),0) FROM reviews r WHERE r.trek_id = t.id
    ) >= p_min_rating)
  ORDER BY distance_m
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;
