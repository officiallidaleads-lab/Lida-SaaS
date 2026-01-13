-- ============================================
-- LIDA v2 - SUPABASE SCHEMA REFERENCE
-- ============================================
-- This is the complete database schema for the Lida v2 app
-- which uses Supabase (PostgreSQL)
-- ============================================

-- ============================================
-- TABLE: profiles
-- ============================================
-- Stores user account information and subscription plan
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    plan TEXT DEFAULT 'free', -- 'free', 'pro', 'agency'
    subscription_status TEXT DEFAULT 'inactive' -- 'active', 'inactive', 'cancelled'
    -- NOTE: No updated_at column exists in this table
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- TABLE: user_usage
-- ============================================
-- Tracks daily usage counts for searches and saves
CREATE TABLE user_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    searches_count INTEGER DEFAULT 0,
    leads_saved_count INTEGER DEFAULT 0, -- Also referenced as saves_count in some queries
    date DATE DEFAULT CURRENT_DATE,
    UNIQUE(user_id, date) -- One record per user per day
);

-- Enable Row Level Security
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own usage
CREATE POLICY "Users can view own usage" ON user_usage
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- TABLE: saved_leads
-- ============================================
-- Stores leads saved by users
CREATE TABLE saved_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    niche TEXT,
    location TEXT,
    url TEXT,
    platform TEXT, -- 'linkedin.com', 'facebook.com', etc.
    snippet TEXT, -- Description/snippet from search
    status TEXT DEFAULT 'new', -- 'new', 'contacted', 'follow_up', 'converted', 'not_interested'
    email TEXT,
    phone TEXT,
    notes TEXT,
    enrichment JSONB, -- AI enrichment data
    date_added TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE saved_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see/manage their own leads
CREATE POLICY "Users can view own leads" ON saved_leads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads" ON saved_leads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads" ON saved_leads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads" ON saved_leads
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- FUNCTION: increment_searches
-- ============================================
-- RPC function to increment search count for a user
CREATE OR REPLACE FUNCTION increment_searches(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_usage (user_id, searches_count, date)
    VALUES (user_id_param, 1, CURRENT_DATE)
    ON CONFLICT (user_id, date)
    DO UPDATE SET searches_count = user_usage.searches_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: increment_saves
-- ============================================
-- RPC function to increment save count for a user
CREATE OR REPLACE FUNCTION increment_saves(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_usage (user_id, leads_saved_count, date)
    VALUES (user_id_param, 1, CURRENT_DATE)
    ON CONFLICT (user_id, date)
    DO UPDATE SET leads_saved_count = user_usage.leads_saved_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PLAN LIMITS (Reference - Implemented in Code)
-- ============================================
-- Free Plan: 5 searches/day, 5 saves/day
-- Pro Plan: 1000 searches/day, 1000 saves/day
-- Agency Plan: 10000 searches/day, 10000 saves/day

-- ============================================
-- SAMPLE QUERIES
-- ============================================

-- Get user profile and current usage
SELECT 
    u.email,
    p.plan,
    p.subscription_status,
    COALESCE(uu.searches_count, 0) as searches_used,
    COALESCE(uu.leads_saved_count, 0) as saves_used
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN user_usage uu ON uu.user_id = u.id AND uu.date = CURRENT_DATE
WHERE u.email = 'your_email@example.com';

-- Upgrade user to Pro
UPDATE profiles 
SET plan = 'pro', subscription_status = 'active'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your_email@example.com');

-- Reset daily usage (for testing)
DELETE FROM user_usage 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your_email@example.com')
AND date = CURRENT_DATE;

-- View all saved leads for a user
SELECT * FROM saved_leads
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your_email@example.com')
ORDER BY date_added DESC;
