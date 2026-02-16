import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { serviceAdmin } from '../_shared/supabaseClient.ts';

serve(async (req) => {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { data: userData, error: userErr } = await serviceAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });

    const body = await req.json();
    const payload = {
      trek_id: body.trek_id,
      user_id: userData.user.id,
    };

    const res = await serviceAdmin.from('bookmarks').insert(payload).select();
    if (res.error) return new Response(JSON.stringify({ error: res.error.message }), { status: 400 });

    return new Response(JSON.stringify({ data: res.data }), { headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
