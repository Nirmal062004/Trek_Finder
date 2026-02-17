-- 1. Create a secure function to check if the current user is an admin
-- SECURITY DEFINER means this function runs with the privileges of the database owner,
-- bypassing RLS on the 'profiles' table to avoid infinite recursion loops.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Enable Row Level Security (RLS) on all tables (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 3. Define Policies for PROFILES Table
-- Policy: Everyone can read profiles (needed for showing authors, etc.)
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Policy: Admins can update any profile (e.g. banning users, changing roles)
CREATE POLICY "Admins can update any profile" 
ON public.profiles FOR UPDATE 
USING (is_admin());

-- Policy: Admins can delete any profile
CREATE POLICY "Admins can delete any profile" 
ON public.profiles FOR DELETE 
USING (is_admin());

-- 4. Define Policies for TREKS Table
-- Policy: Everyone can read treks
CREATE POLICY "Treks are viewable by everyone" 
ON public.treks FOR SELECT 
USING (true);

-- Policy: Only Admins can insert new treks
CREATE POLICY "Admins can insert treks" 
ON public.treks FOR INSERT 
WITH CHECK (is_admin());

-- Policy: Only Admins can update treks
CREATE POLICY "Admins can update treks" 
ON public.treks FOR UPDATE 
USING (is_admin());

-- Policy: Only Admins can delete treks
CREATE POLICY "Admins can delete treks" 
ON public.treks FOR DELETE 
USING (is_admin());

-- 5. Define Policies for COMMUNITIES Table
-- Policy: Everyone can read communities
CREATE POLICY "Communities are viewable by everyone" 
ON public.communities FOR SELECT 
USING (true);

-- Policy: Only Admins can insert communities
CREATE POLICY "Admins can insert communities" 
ON public.communities FOR INSERT 
WITH CHECK (is_admin());

-- Policy: Only Admins can update communities
CREATE POLICY "Admins can update communities" 
ON public.communities FOR UPDATE 
USING (is_admin());

-- Policy: Only Admins can delete communities
CREATE POLICY "Admins can delete communities" 
ON public.communities FOR DELETE 
USING (is_admin());

-- 6. Define Policies for REVIEWS Table
-- Policy: Everyone can read reviews
CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews FOR SELECT 
USING (true);

-- Policy: Authenticated users can insert their own reviews
CREATE POLICY "Users can insert own reviews" 
ON public.reviews FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update/delete their own reviews, Admins can manage all
CREATE POLICY "Users can manage own reviews" 
ON public.reviews FOR UPDATE 
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can delete own reviews" 
ON public.reviews FOR DELETE 
USING (auth.uid() = user_id OR is_admin());
