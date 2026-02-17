import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

if (!SUPABASE_URL) throw new Error('SUPABASE_URL env missing');

export const serviceAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
export const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function createAuthClient(req: Request) {
    return (createClient as any)(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: { Authorization: req.headers.get('Authorization')! },
        },
    });
}
