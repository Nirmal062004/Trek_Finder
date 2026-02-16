import { supabase } from './supabaseClient';

// Auth API - using Supabase directly
export const authAPI = {
	register: async (data: { email: string; password: string; name: string }) => {
		const { email, password, name } = data;
		const { data: signUpData, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: { name }
			}
		});

		if (error) throw error;

		const session = signUpData?.session ?? null;
		const user = signUpData?.user ?? null;
		if (session?.access_token) {
			localStorage.setItem('token', session.access_token);
		}

		return { user, session };
	},

	login: async (data: { email: string; password: string }) => {
		const { email, password } = data;
		const { data: signInData, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) throw error;

		const session = signInData?.session ?? null;
		const user = signInData?.user ?? null;

		if (session?.access_token) {
			localStorage.setItem('token', session.access_token);
		}

		return { user, session };
	},

	verify: async () => {
		// Only run client-side (Supabase client auth helpers require a browser session)
		if (typeof window === 'undefined') return null;

		try {
			const token = localStorage.getItem('token');
			if (!token) {
				// No token stored — ensure clean state
				localStorage.removeItem('isAuthenticated');
				localStorage.removeItem('userName');
				localStorage.removeItem('isAdmin');
				return null;
			}

			const { data, error } = await supabase.auth.getUser();
			if (error) {
				// Clear invalid auth state
				localStorage.removeItem('token');
				localStorage.removeItem('isAuthenticated');
				localStorage.removeItem('userName');
				localStorage.removeItem('isAdmin');
				try { await supabase.auth.signOut(); } catch (_) { }
				throw error;
			}
			return data;
		} catch (error) {
			// Ensure clean state on error
			localStorage.removeItem('token');
			localStorage.removeItem('isAuthenticated');
			localStorage.removeItem('userName');
			localStorage.removeItem('isAdmin');
			throw error;
		}
	},

	logout: async () => {
		try {
			await supabase.auth.signOut();
		} catch (error) {
			console.error('Supabase signOut error:', error);
		}
		// Clear all auth-related storage
		localStorage.removeItem('token');
		localStorage.removeItem('isAuthenticated');
		localStorage.removeItem('userName');
		localStorage.removeItem('isAdmin');
	},

	updateUser: async (updates: { email?: string; password?: string; data?: { name?: string } }) => {
		const { data, error } = await supabase.auth.updateUser(updates);
		if (error) throw error;
		return data;
	},
};

// Legacy trekAPI and healthCheck removed as backend is gone.
// Components should use Overpass API directly or mocked data.

// Edge Functions callers
const FUNCTIONS_BASE = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || '';

const makeAuthHeaders = (): Headers => {
	const headers = new Headers();
	headers.set('content-type', 'application/json');
	if (typeof window !== 'undefined') {
		const token = localStorage.getItem('token');
		if (token) headers.set('Authorization', `Bearer ${token}`);
	}
	return headers;
};

export const backendAPI = {
	searchTreks: async (params: { lat: number; lng: number; radius_m?: number; tags?: string[]; difficulty?: number; min_rating?: number; limit?: number; offset?: number }) => {
		if (!FUNCTIONS_BASE) throw new Error('Missing NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL');

		const res = await fetch(`${FUNCTIONS_BASE}/search`, {
			method: 'POST',
			headers: makeAuthHeaders(),
			body: JSON.stringify(params),
		});

		if (!res.ok) throw new Error(`Search failed: ${res.status}`);
		return res.json();
	},

	addReview: async (payload: { trek_id: string; rating: number; comment?: string }) => {
		if (!FUNCTIONS_BASE) throw new Error('Missing NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL');
		const res = await fetch(`${FUNCTIONS_BASE}/review`, {
			method: 'POST',
			headers: makeAuthHeaders(),
			body: JSON.stringify(payload),
		});
		if (!res.ok) throw new Error(`Add review failed: ${res.status}`);
		return res.json();
	},

	addBookmark: async (payload: { trek_id: string }) => {
		if (!FUNCTIONS_BASE) throw new Error('Missing NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL');
		const res = await fetch(`${FUNCTIONS_BASE}/bookmark`, {
			method: 'POST',
			headers: makeAuthHeaders(),
			body: JSON.stringify(payload),
		});
		if (!res.ok) throw new Error(`Bookmark failed: ${res.status}`);
		return res.json();
	},

	sendMessage: async (payload: { channel_id: string; content: string; metadata?: Record<string, unknown> }) => {
		if (!FUNCTIONS_BASE) throw new Error('Missing NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL');
		const res = await fetch(`${FUNCTIONS_BASE}/chat`, {
			method: 'POST',
			headers: makeAuthHeaders(),
			body: JSON.stringify(payload),
		});
		if (!res.ok) throw new Error(`Chat send failed: ${res.status}`);
		return res.json();
	},

	// Real Database Access
	getUsers: async () => {
		const { data, error } = await supabase.from('profiles').select('*');
		if (error) {
			console.warn('Fetch profiles failed:', error.message);
			return [];
		}
		return data || [];
	},

	deleteUser: async (id: string) => {
		const { error } = await supabase.from('profiles').delete().eq('id', id);
		if (error) throw error;
	},

	createUser: async (profile: any) => {
		const { data, error } = await supabase.from('profiles').insert(profile).select().single();
		if (error) throw error;
		return data;
	},

	updateUser: async (id: string, updates: any) => {
		const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
		if (error) throw error;
		return data;
	},

	getTreks: async () => {
		const { data, error } = await supabase.from('treks').select('*').order('created_at', { ascending: false });
		if (error) {
			console.warn('Fetch treks failed:', error.message);
			return [];
		}
		return data || [];
	},

	createTrek: async (trek: any) => {
		const { data, error } = await supabase.from('treks').insert(trek).select().single();
		if (error) throw error;
		return data;
	},

	updateTrek: async (id: string, updates: any) => {
		const { data, error } = await supabase.from('treks').update(updates).eq('id', id).select().single();
		if (error) throw error;
		return data;
	},

	deleteTrek: async (id: string) => {
		const { error } = await supabase.from('treks').delete().eq('id', id);
		if (error) throw error;
	},

	getCommunities: async () => {
		const { data, error } = await supabase.from('communities').select('*');
		if (error) {
			console.warn('Fetch communities failed:', error.message);
			return [];
		}
		return data || [];
	},

	createCommunity: async (comm: any) => {
		const { data, error } = await supabase.from('communities').insert(comm).select().single();
		if (error) throw error;
		return data;
	},

	updateCommunity: async (id: string, updates: any) => {
		const { data, error } = await supabase.from('communities').update(updates).eq('id', id).select().single();
		if (error) throw error;
		return data;
	},

	deleteCommunity: async (id: string) => {
		const { error } = await supabase.from('communities').delete().eq('id', id);
		if (error) throw error;
	},

	getReviews: async () => {
		const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
		if (error) {
			console.warn('Fetch reviews failed:', error.message);
			return [];
		}
		return data || [];
	},

	deleteReview: async (id: string) => {
		const { error } = await supabase.from('reviews').delete().eq('id', id);
		if (error) throw error;
	},

	updateReview: async (id: string, updates: any) => {
		const { data, error } = await supabase.from('reviews').update(updates).eq('id', id).select().single();
		if (error) throw error;
		return data;
	}
};
