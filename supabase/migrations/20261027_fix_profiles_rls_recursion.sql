-- 20261027_fix_profiles_rls_recursion.sql
-- Fix infinite recursion: admins policies on public.profiles used subquery to profiles itself
-- Use SECURITY DEFINER helper to check admin role safely

BEGIN;

-- Create helper function to check admin without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
END;
$$;

-- Ensure only authenticated users can call helper (not strictly required but safe)
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Replace recursive admin policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Also fix properties admin policies if they recurse
DROP POLICY IF EXISTS "Admins can manage all properties" ON public.properties;
CREATE POLICY "Admins can manage all properties"
  ON public.properties
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMIT;
