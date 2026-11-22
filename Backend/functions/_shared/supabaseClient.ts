import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SECRET_KEY = Deno.env.get('SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

if (!SUPABASE_URL) throw new Error('SUPABASE_URL env missing');

export const serviceAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});
export const anonClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

export const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function createAuthClient(req: Request) {
	return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
		global: {
			headers: { Authorization: req.headers.get('Authorization')! },
		},
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}
