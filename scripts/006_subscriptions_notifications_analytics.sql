-- HomeSchoolar Subscriptions, Notifications & Analytics Schema
-- Run this AFTER the previous scripts

-- ============================================
-- PAYMENTS & SUBSCRIPTIONS
-- ============================================

-- Update subscriptions table with Stripe/PayPal fields
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paypal_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount_paid INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'usd';

-- Payments history table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'stripe', -- stripe, paypal
  provider_payment_id TEXT,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, refunded
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription plans reference table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY, -- trial, monthly, yearly
  name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL DEFAULT 0, -- in cents
  price_yearly INTEGER NOT NULL DEFAULT 0, -- in cents
  features JSONB DEFAULT '[]',
  ai_worksheet_limit INTEGER DEFAULT -1, -- -1 = unlimited
  ai_quiz_limit INTEGER DEFAULT -1,
  max_children INTEGER DEFAULT -1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, ai_worksheet_limit, ai_quiz_limit, max_children) VALUES
  ('trial', 'Free Trial', '14-day full access trial', 0, 0, '["All AI features", "Unlimited worksheets", "Up to 3 children", "Email support"]', -1, -1, 3),
  ('monthly', 'Monthly Plan', 'Full access billed monthly', 1900, 0, '["All AI features", "Unlimited worksheets", "Unlimited children", "Priority support", "PDF exports"]', -1, -1, -1),
  ('yearly', 'Yearly Plan', 'Full access billed yearly - Save 35%', 0, 14900, '["All AI features", "Unlimited worksheets", "Unlimited children", "Priority support", "PDF exports", "Early access to new features"]', -1, -1, -1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- NOTIFICATIONS
-- ============================================

-- Update notifications table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_label TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  email_quiz_results BOOLEAN DEFAULT true,
  email_progress_updates BOOLEAN DEFAULT true,
  email_ai_recommendations BOOLEAN DEFAULT true,
  email_subscription_alerts BOOLEAN DEFAULT true,
  email_weekly_summary BOOLEAN DEFAULT true,
  inapp_quiz_alerts BOOLEAN DEFAULT true,
  inapp_worksheet_completed BOOLEAN DEFAULT true,
  inapp_recommendations BOOLEAN DEFAULT true,
  inapp_achievements BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS
-- ============================================

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  child_id UUID REFERENCES children(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- worksheet_started, worksheet_completed, quiz_taken, login, etc.
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily aggregated stats (for faster queries)
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  active_users INTEGER DEFAULT 0,
  new_signups INTEGER DEFAULT 0,
  worksheets_completed INTEGER DEFAULT 0,
  quizzes_taken INTEGER DEFAULT 0,
  ai_generations INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- Monthly subscription stats
CREATE TABLE IF NOT EXISTS subscription_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL, -- First day of month
  total_subscribers INTEGER DEFAULT 0,
  new_subscribers INTEGER DEFAULT 0,
  churned_subscribers INTEGER DEFAULT 0,
  mrr_cents INTEGER DEFAULT 0, -- Monthly Recurring Revenue
  trial_conversions INTEGER DEFAULT 0,
  plan_distribution JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month)
);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_stats ENABLE ROW LEVEL SECURITY;

-- Payments: Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments FOR SELECT USING (auth.uid() = user_id);

-- Subscription plans: Everyone can view active plans
CREATE POLICY "Anyone can view active plans" ON subscription_plans FOR SELECT USING (is_active = true);

-- Notification preferences: Users manage their own
CREATE POLICY "Users can manage own preferences" ON notification_preferences FOR ALL USING (auth.uid() = user_id);

-- Analytics events: Users can view their own, admins can view all
CREATE POLICY "Users can view own events" ON analytics_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all events" ON analytics_events FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Daily stats: Admins only
CREATE POLICY "Admins can view daily stats" ON daily_stats FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Subscription stats: Admins only
CREATE POLICY "Admins can view subscription stats" ON subscription_stats FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
