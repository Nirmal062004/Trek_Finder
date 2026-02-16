import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Ensure they are set in the root .env file.');
}

declare global {
	// Allow a single shared client during HMR/dev reloads
	// eslint-disable-next-line no-var
	var __supabase_client__: SupabaseClient | undefined;
}

const globalRef = globalThis as unknown as { __supabase_client__?: SupabaseClient };

export const supabase = globalRef.__supabase_client__ ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;

