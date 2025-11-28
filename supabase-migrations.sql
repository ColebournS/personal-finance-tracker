-- SimpleFin Integration Database Migrations
-- Run this in your Supabase SQL Editor

-- Add SimpleFin-related columns to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS simplefin_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_simplefin_synced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_synced TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'other';

-- Add SimpleFin access URL to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS simplefin_access_url TEXT;

-- Create index for faster SimpleFin ID lookups
CREATE INDEX IF NOT EXISTS idx_accounts_simplefin_id ON accounts(simplefin_id);

-- Ensure RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create or replace policy for profiles table
DROP POLICY IF EXISTS "Allow users to update their own simplefin_access_url" ON profiles;
CREATE POLICY "Allow users to update their own simplefin_access_url"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure users can insert their own profile if it doesn't exist
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON profiles;
CREATE POLICY "Allow users to insert their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Ensure users can read their own profile
DROP POLICY IF EXISTS "Allow users to read their own profile" ON profiles;
CREATE POLICY "Allow users to read their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

