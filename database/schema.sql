-- ============================================================
-- SOCIALPILOT AI - Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for text search

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'agency')),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BRANDS (= Streams)
-- ============================================================
CREATE TABLE public.brands (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  website TEXT,
  industry TEXT,
  -- AI + Content Rules
  tone TEXT NOT NULL DEFAULT 'professional' CHECK (tone IN ('professional', 'casual', 'friendly', 'authoritative', 'humorous', 'inspirational')),
  voice_description TEXT,
  default_hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  banned_words TEXT[] DEFAULT ARRAY[]::TEXT[],
  cta_style TEXT,
  -- Working Hours (JSON: {day: {start: "09:00", end: "17:00", enabled: bool}})
  working_hours JSONB NOT NULL DEFAULT '{}',
  -- Approval Settings
  require_approval BOOLEAN NOT NULL DEFAULT true,
  auto_approve_ai BOOLEAN NOT NULL DEFAULT false,
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- ============================================================
-- SOCIAL ACCOUNTS (encrypted tokens stored server-side)
-- ============================================================
CREATE TABLE public.social_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'youtube')),
  account_type TEXT NOT NULL CHECK (account_type IN ('page', 'profile', 'company', 'channel', 'personal')),
  platform_account_id TEXT NOT NULL,
  platform_account_name TEXT NOT NULL,
  platform_username TEXT,
  avatar_url TEXT,
  -- Encrypted token storage (never exposed to frontend)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  token_scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- Connection status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error', 'paused')),
  last_error TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,
  -- Rate limit tracking
  rate_limit_remaining INTEGER,
  rate_limit_reset_at TIMESTAMPTZ,
  daily_post_count INTEGER NOT NULL DEFAULT 0,
  daily_post_reset_at TIMESTAMPTZ,
  -- Metadata from platform
  platform_metadata JSONB NOT NULL DEFAULT '{}',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(brand_id, platform, platform_account_id)
);

-- ============================================================
-- CONTENT ITEMS (drafts, approved content)
-- ============================================================
CREATE TABLE public.content_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  -- Target platforms
  target_platforms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  target_account_ids UUID[] DEFAULT ARRAY[]::UUID[],
  -- Content
  title TEXT,
  caption TEXT,
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  first_comment TEXT,
  -- Platform-specific overrides
  platform_overrides JSONB NOT NULL DEFAULT '{}',
  -- e.g. { "facebook": { "caption": "...", "link": "..." }, "youtube": { "title": "...", "description": "...", "tags": [...] } }
  -- Media
  media_asset_ids UUID[] DEFAULT ARRAY[]::UUID[],
  link_url TEXT,
  link_preview JSONB,
  -- Workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'scheduled', 'publishing', 'published', 'failed', 'paused')),
  rejection_reason TEXT,
  -- AI Generation
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  ai_generation_id UUID,
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule JSONB,
  -- Metadata
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SCHEDULED POSTS (individual platform publish tasks)
-- ============================================================
CREATE TABLE public.scheduled_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'published', 'failed', 'cancelled', 'paused')),
  -- Platform response
  platform_post_id TEXT,
  platform_post_url TEXT,
  published_at TIMESTAMPTZ,
  -- Error handling
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  -- Queue
  job_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PUBLISH JOBS (audit trail for publishing attempts)
-- ============================================================
CREATE TABLE public.publish_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  scheduled_post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('publish', 'reply', 'comment', 'dm', 'delete')),
  -- Request/response log
  request_payload JSONB,
  response_payload JSONB,
  -- Result
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'rate_limited', 'auth_error')),
  error_code TEXT,
  error_message TEXT,
  -- Timing
  duration_ms INTEGER,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MEDIA ASSETS (AWS S3 backed)
-- ============================================================
CREATE TABLE public.media_assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  -- File info
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'gif', 'document')),
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  -- S3 storage
  s3_key TEXT NOT NULL UNIQUE,
  s3_bucket TEXT NOT NULL,
  cdn_url TEXT,
  -- Image/video dimensions
  width INTEGER,
  height INTEGER,
  duration_seconds NUMERIC,
  -- Thumbnail
  thumbnail_s3_key TEXT,
  thumbnail_cdn_url TEXT,
  -- Organization
  alt_text TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  folder TEXT,
  -- AI generated
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  ai_prompt TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INBOX MESSAGES
-- ============================================================
CREATE TABLE public.inbox_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('comment', 'dm', 'mention', 'review')),
  -- Platform IDs
  platform_message_id TEXT NOT NULL,
  platform_parent_id TEXT,
  platform_post_id TEXT,
  -- Sender info
  sender_id TEXT,
  sender_name TEXT,
  sender_username TEXT,
  sender_avatar_url TEXT,
  -- Content
  content TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'unknown')),
  language TEXT DEFAULT 'en',
  -- Status
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived', 'flagged', 'spam')),
  -- AI suggestions
  ai_reply_suggestions JSONB,
  -- Moderation
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  moderation_notes TEXT,
  -- Timestamps
  platform_created_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform, platform_message_id)
);

-- ============================================================
-- INBOX REPLIES (sent replies)
-- ============================================================
CREATE TABLE public.inbox_replies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES public.inbox_messages(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  -- Approval
  was_ai_suggested BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  -- Platform response
  platform_reply_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'published', 'failed')),
  error_message TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AI GENERATIONS (log of all AI operations)
-- ============================================================
CREATE TABLE public.ai_generations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  generation_type TEXT NOT NULL CHECK (generation_type IN ('caption', 'hashtags', 'reply', 'image', 'variation', 'seo', 'cta', 'first_comment')),
  -- Input
  prompt TEXT,
  context_data JSONB,
  -- Output
  result JSONB NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INTEGER,
  -- Quality
  was_used BOOLEAN NOT NULL DEFAULT false,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  -- Status
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS
-- ============================================================
CREATE TABLE public.analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE SET NULL,
  scheduled_post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  platform_post_id TEXT,
  -- Date
  recorded_date DATE NOT NULL,
  -- Metrics
  impressions BIGINT NOT NULL DEFAULT 0,
  reach BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  comments BIGINT NOT NULL DEFAULT 0,
  shares BIGINT NOT NULL DEFAULT 0,
  saves BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  video_views BIGINT NOT NULL DEFAULT 0,
  video_watch_time_seconds BIGINT NOT NULL DEFAULT 0,
  profile_visits BIGINT NOT NULL DEFAULT 0,
  followers_gained INTEGER NOT NULL DEFAULT 0,
  followers_lost INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,4),
  -- Raw data
  raw_metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scheduled_post_id, platform, recorded_date)
);

-- ============================================================
-- AUDIT LOGS (immutable action history)
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  -- Action
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  -- Details
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  -- Result
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- APPROVAL REQUESTS
-- ============================================================
CREATE TABLE public.approval_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES public.users(id) NOT NULL,
  reviewed_by UUID REFERENCES public.users(id),
  -- Action type
  action_type TEXT NOT NULL DEFAULT 'publish' CHECK (action_type IN ('publish', 'bulk_reply', 'dm', 'auto_reply')),
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  rejection_reason TEXT,
  notes TEXT,
  -- Timing
  expires_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONTENT TEMPLATES
-- ============================================================
CREATE TABLE public.content_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  platforms TEXT[] DEFAULT ARRAY[]::TEXT[],
  caption_template TEXT,
  hashtags TEXT[] DEFAULT ARRAY[]::TEXT[],
  variables JSONB DEFAULT '[]',
  is_global BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUTOMATION RULES (AI engagement rules)
-- ============================================================
CREATE TABLE public.automation_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  -- Trigger
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword', 'sentiment', 'new_follower', 'mention', 'comment')),
  trigger_config JSONB NOT NULL DEFAULT '{}',
  -- Action
  action_type TEXT NOT NULL CHECK (action_type IN ('suggest_reply', 'auto_reply', 'flag', 'archive', 'notify')),
  action_config JSONB NOT NULL DEFAULT '{}',
  -- Safety
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  max_daily_actions INTEGER NOT NULL DEFAULT 10,
  daily_action_count INTEGER NOT NULL DEFAULT 0,
  daily_reset_at TIMESTAMPTZ,
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SYSTEM HEALTH / CIRCUIT BREAKER STATE
-- ============================================================
CREATE TABLE public.platform_health (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  social_account_id UUID REFERENCES public.social_accounts(id) ON DELETE CASCADE NOT NULL,
  -- Circuit breaker
  state TEXT NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  next_test_at TIMESTAMPTZ,
  -- Recent activity
  requests_last_hour INTEGER NOT NULL DEFAULT 0,
  errors_last_hour INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(social_account_id)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
-- Brands
CREATE INDEX idx_brands_user_id ON public.brands(user_id);
CREATE INDEX idx_brands_slug ON public.brands(user_id, slug);

-- Social accounts
CREATE INDEX idx_social_accounts_brand_id ON public.social_accounts(brand_id);
CREATE INDEX idx_social_accounts_platform ON public.social_accounts(platform);
CREATE INDEX idx_social_accounts_status ON public.social_accounts(status);

-- Content items
CREATE INDEX idx_content_items_brand_id ON public.content_items(brand_id);
CREATE INDEX idx_content_items_status ON public.content_items(status);
CREATE INDEX idx_content_items_scheduled_at ON public.content_items(scheduled_at);

-- Scheduled posts
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_scheduled_at ON public.scheduled_posts(scheduled_at);
CREATE INDEX idx_scheduled_posts_brand_id ON public.scheduled_posts(brand_id);
CREATE INDEX idx_scheduled_posts_account ON public.scheduled_posts(social_account_id);

-- Publish jobs
CREATE INDEX idx_publish_jobs_account ON public.publish_jobs(social_account_id);
CREATE INDEX idx_publish_jobs_executed_at ON public.publish_jobs(executed_at);

-- Inbox messages
CREATE INDEX idx_inbox_messages_brand_id ON public.inbox_messages(brand_id);
CREATE INDEX idx_inbox_messages_status ON public.inbox_messages(status);
CREATE INDEX idx_inbox_messages_platform ON public.inbox_messages(platform, message_type);
CREATE INDEX idx_inbox_messages_created_at ON public.inbox_messages(created_at DESC);

-- Analytics
CREATE INDEX idx_analytics_brand_id ON public.analytics(brand_id);
CREATE INDEX idx_analytics_date ON public.analytics(recorded_date DESC);
CREATE INDEX idx_analytics_account ON public.analytics(social_account_id);

-- Audit logs
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_brand_id ON public.audit_logs(brand_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- AI generations
CREATE INDEX idx_ai_generations_brand_id ON public.ai_generations(brand_id);
CREATE INDEX idx_ai_generations_type ON public.ai_generations(generation_type);

-- Media assets
CREATE INDEX idx_media_assets_brand_id ON public.media_assets(brand_id);
CREATE INDEX idx_media_assets_status ON public.media_assets(status);

-- ============================================================
-- UPDATED_AT trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.social_accounts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.content_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.scheduled_posts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inbox_messages FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.analytics FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.content_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.automation_rules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE USER on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
