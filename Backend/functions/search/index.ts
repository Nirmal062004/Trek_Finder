import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { anonClient } from '../_shared/supabaseClient.ts';

serve(async (req) => {
  try {
    const body = await req.json();
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const radius_m = Number(body.radius_m ?? 5000);
    const p_tags = body.tags ?? null;
    const p_difficulty = body.difficulty ?? null;
    const p_min_rating = body.min_rating ?? null;
    const p_limit = body.limit ?? 50;
    const p_offset = body.offset ?? 0;

    const res = await anonClient.rpc('search_treks', {
      p_lat: lat,
      p_lng: lng,
      p_radius_m: radius_m,
      p_min_rating: p_min_rating,
      p_tags: p_tags,
      p_difficulty: p_difficulty,
      p_limit,
      p_offset,
    });

    if (res.error) {
      return new Response(JSON.stringify({ error: res.error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ data: res.data }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
