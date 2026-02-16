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
    const channel_id = body.channel_id;
    const content = body.content;
    const metadata = body.metadata ?? {};

    if (!channel_id || !content) return new Response(JSON.stringify({ error: 'channel_id and content required' }), { status: 400 });

    const payload = {
      channel_id,
      user_id: userData.user.id,
      content,
      metadata,
    };

    const res = await serviceAdmin.from('messages').insert(payload).select();
    if (res.error) return new Response(JSON.stringify({ error: res.error.message }), { status: 400 });

    // Supabase Realtime will broadcast inserted message to subscribers.
    return new Response(JSON.stringify({ data: res.data }), { headers: { 'content-type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
