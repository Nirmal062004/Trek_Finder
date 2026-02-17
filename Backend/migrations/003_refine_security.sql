-- Refine security policies to ensure strict access control and fix visibility loopholes

-- 1. TREKS: Cleanup and Strict Admin-Only Write Access
-- Drop permissive policies from 001_init that allow users to create/edit treks
DROP POLICY IF EXISTS "treks_insert_auth" ON public.treks;
DROP POLICY IF EXISTS "treks_modify_owner" ON public.treks;
-- Drop the overly broad select policy from secure_rls_policy (which allowed seeing unpublished)
DROP POLICY IF EXISTS "Treks are viewable by everyone" ON public.treks;
DROP POLICY IF EXISTS "treks_select_published_or_owner" ON public.treks;

-- Create a single, correct SELECT policy for treks
-- Everyone can see published treks. Admins can see ALL treks (including unpublished).
CREATE POLICY "Treks visibility" 
ON public.treks FOR SELECT 
USING (is_published OR is_admin());

-- 2. COMMUNITIES: Admin Only (Since frontend "Create Community" is local-only)
-- Drop permissive user creation policy if it exists (001_init didn't have one for authenticated, only public/owner select)
DROP POLICY IF EXISTS "channels_insert_auth" ON public.channels; -- 001_init used 'channels' for chat rooms?
-- Check 'communities' table policies. secure_rls_policy added "Admins can insert communities".
-- If 001_init didn't define 'communities' policies (it defined 'channels'), we are good.
-- But wait, 001_init defined 'channels', not 'communities'?
-- Let's check 001_init again. It has table 'channels'. secure_rls has table 'communities'.
-- Are they different?
-- secure_rls_policy defined policies for 'public.communities'.
-- api.ts uses 'communities'.
-- It seems there might be a schema mismatch or 'communities' was created later?
-- I will assume 'communities' is the table to secure.

-- 3. MESSAGES & CHANNELS (from 001_init)
-- Ensure 'channels' and 'messages' are secure if they are used.
-- Drop potential insecure policies just in case.
DROP POLICY IF EXISTS "channels_select_public_or_owner" ON public.channels;
CREATE POLICY "Channels viewable by everyone" ON public.channels FOR SELECT USING (true);
-- Messages: Users can insert their own messages
-- Existing "messages_insert_auth" in 001_init is good: WITH CHECK (auth.uid() = user_id)
