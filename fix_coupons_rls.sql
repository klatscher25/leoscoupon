-- Fix für Coupons RLS Policy Problem
-- Führe diese SQL-Befehle im Supabase SQL Editor aus:

-- 1. Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'coupons';

-- 2. Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view coupons" ON coupons;
DROP POLICY IF EXISTS "Users can create coupons" ON coupons;
DROP POLICY IF EXISTS "Users can update own coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can manage all coupons" ON coupons;
DROP POLICY IF EXISTS "Enable read access for all users" ON coupons;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON coupons;
DROP POLICY IF EXISTS "Enable update for creators" ON coupons;

-- 3. Temporarily disable RLS to test
-- ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;

-- 4. OR create proper policies that work
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all coupons
CREATE POLICY "coupons_select_authenticated" ON coupons 
  FOR SELECT TO authenticated 
  USING (true);

-- Allow authenticated users to insert coupons (with their user ID)
CREATE POLICY "coupons_insert_authenticated" ON coupons 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

-- Allow users to update their own coupons
CREATE POLICY "coupons_update_own" ON coupons 
  FOR UPDATE TO authenticated 
  USING (auth.uid() = created_by OR created_by IS NULL);

-- Allow users to delete their own coupons  
CREATE POLICY "coupons_delete_own" ON coupons 
  FOR DELETE TO authenticated 
  USING (auth.uid() = created_by OR created_by IS NULL);

-- Service role bypass for admin operations
CREATE POLICY "coupons_service_role_bypass" ON coupons 
  FOR ALL TO service_role 
  USING (true) 
  WITH CHECK (true);
