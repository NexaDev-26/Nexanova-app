-- ============================================
-- Supabase RLS Policy Fix for Backend Operations
-- ============================================
-- 
-- This script fixes Row Level Security policies to allow backend operations
-- Run this in Supabase Dashboard → SQL Editor
--
-- ============================================

-- Drop existing user insert policy if it exists
DROP POLICY IF EXISTS "Service can insert users" ON users;

-- Create new policy that allows inserts without auth.uid() check
-- This allows the backend (using service role) to insert users
CREATE POLICY "Backend can insert users" ON users
    FOR INSERT 
    WITH CHECK (true);

-- Also allow backend to read users for login/verification
CREATE POLICY "Backend can read users for auth" ON users
    FOR SELECT 
    USING (true);

-- Allow backend to update users (for profile updates, password changes, etc.)
CREATE POLICY "Backend can update users" ON users
    FOR UPDATE 
    USING (true)
    WITH CHECK (true);

-- ============================================
-- Alternative: If you want to use service role key instead
-- ============================================
-- The backend should use SUPABASE_SERVICE_ROLE_KEY in .env
-- Service role key bypasses all RLS policies automatically
-- This is the recommended approach for backend operations

-- ============================================
-- Notes:
-- ============================================
-- 1. Service role key bypasses RLS - recommended for backend
-- 2. Anon key respects RLS - use for frontend direct access
-- 3. Backend should use service role key for all operations
-- 4. Add SUPABASE_SERVICE_ROLE_KEY to your .env file

