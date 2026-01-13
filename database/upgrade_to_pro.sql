-- ============================================
-- UPGRADE ACCOUNT TO PRO (For Testing)
-- ============================================
-- This script upgrades your account to Pro plan
-- Run this in Supabase SQL Editor
-- ============================================

-- STEP 1: Find your User ID (run this first to see your email/id)
-- Uncomment the line below to see all users:
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- STEP 2: Upgrade to Pro Plan
-- Replace 'YOUR_EMAIL_HERE' with your actual email address
UPDATE profiles 
SET 
    plan = 'pro',
    subscription_status = 'active'
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
);

-- STEP 3: Reset Usage Counters (fresh start for testing)
-- This resets your usage counts to 0 so you have full Pro limits (1000/1000)
UPDATE user_usage
SET 
    searches_count = 0,
    leads_saved_count = 0,
    last_reset_date = CURRENT_DATE
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
);

-- STEP 4: Verify the upgrade (run this to confirm)
SELECT 
    u.email,
    p.plan,
    p.subscription_status,
    COALESCE(uu.searches_count, 0) as searches_used,
    COALESCE(uu.leads_saved_count, 0) as saves_used,
    uu.last_reset_date
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN user_usage uu ON uu.user_id = u.id
WHERE u.email = 'YOUR_EMAIL_HERE';

-- ============================================
-- QUICK VERSION (One-liner for your account)
-- ============================================
-- Copy the 3 lines below, replace YOUR_EMAIL_HERE, and run:

-- UPDATE profiles SET plan = 'pro', subscription_status = 'active' WHERE id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE');
-- DELETE FROM user_usage WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE') AND date = CURRENT_DATE;
-- SELECT email, plan FROM profiles p JOIN auth.users u ON p.id = u.id WHERE email = 'YOUR_EMAIL_HERE';
