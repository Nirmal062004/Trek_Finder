import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, createAuthClient } from '../_shared/supabaseClient.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createAuthClient(req);
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const channel_id = body.channel_id;
    const content = body.content;
    const metadata = body.metadata ?? {};

    if (!channel_id || !content) {
      return new Response(JSON.stringify({ error: 'channel_id and content required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = {
      channel_id,
      user_id: user.id,
      content,
      metadata,
    };

    const { data, error } = await supabase.from('messages').insert(payload).select();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Supabase Realtime will broadcast inserted message to subscribers.
    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
