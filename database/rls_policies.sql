-- ============================================================
-- SOCIALPILOT AI - Row Level Security Policies
-- Run AFTER schema.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_health ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS
-- ============================================================
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- BRANDS
-- ============================================================
CREATE POLICY "Users can view own brands"
  ON public.brands FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own brands"
  ON public.brands FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own brands"
  ON public.brands FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own brands"
  ON public.brands FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- SOCIAL ACCOUNTS
-- ============================================================
CREATE POLICY "Users can view own social accounts"
  ON public.social_accounts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own social accounts"
  ON public.social_accounts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own social accounts"
  ON public.social_accounts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own social accounts"
  ON public.social_accounts FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- CONTENT ITEMS
-- ============================================================
CREATE POLICY "Users can view own content"
  ON public.content_items FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own content"
  ON public.content_items FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own content"
  ON public.content_items FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own content"
  ON public.content_items FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- SCHEDULED POSTS
-- ============================================================
CREATE POLICY "Users can view own scheduled posts"
  ON public.scheduled_posts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own scheduled posts"
  ON public.scheduled_posts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own scheduled posts"
  ON public.scheduled_posts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own scheduled posts"
  ON public.scheduled_posts FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- PUBLISH JOBS (append-only audit, users can read)
-- ============================================================
CREATE POLICY "Users can view own publish jobs"
  ON public.publish_jobs FOR SELECT
  USING (user_id = auth.uid());

-- Only service role can insert (via server-side)
CREATE POLICY "Service role can insert publish jobs"
  ON public.publish_jobs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- MEDIA ASSETS
-- ============================================================
CREATE POLICY "Users can view own media"
  ON public.media_assets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can upload media"
  ON public.media_assets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own media"
  ON public.media_assets FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own media"
  ON public.media_assets FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- INBOX MESSAGES
-- ============================================================
CREATE POLICY "Users can view own inbox"
  ON public.inbox_messages FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update inbox messages"
  ON public.inbox_messages FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage inbox"
  ON public.inbox_messages FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- INBOX REPLIES
-- ============================================================
CREATE POLICY "Users can view own replies"
  ON public.inbox_replies FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create replies"
  ON public.inbox_replies FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own replies"
  ON public.inbox_replies FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- AI GENERATIONS
-- ============================================================
CREATE POLICY "Users can view own AI generations"
  ON public.ai_generations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create AI generations"
  ON public.ai_generations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own AI generations"
  ON public.ai_generations FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- ANALYTICS
-- ============================================================
CREATE POLICY "Users can view own analytics"
  ON public.analytics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage analytics"
  ON public.analytics FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- AUDIT LOGS (read-only for users, write via service role)
-- ============================================================
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- APPROVAL REQUESTS
-- ============================================================
CREATE POLICY "Users can view own approval requests"
  ON public.approval_requests FOR SELECT
  USING (requested_by = auth.uid() OR reviewed_by = auth.uid());

CREATE POLICY "Users can create approval requests"
  ON public.approval_requests FOR INSERT
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Users can review approval requests"
  ON public.approval_requests FOR UPDATE
  USING (reviewed_by = auth.uid() OR requested_by = auth.uid());

-- ============================================================
-- CONTENT TEMPLATES
-- ============================================================
CREATE POLICY "Users can view own and global templates"
  ON public.content_templates FOR SELECT
  USING (user_id = auth.uid() OR is_global = true);

CREATE POLICY "Users can create templates"
  ON public.content_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own templates"
  ON public.content_templates FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON public.content_templates FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- AUTOMATION RULES
-- ============================================================
CREATE POLICY "Users can view own rules"
  ON public.automation_rules FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create rules"
  ON public.automation_rules FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own rules"
  ON public.automation_rules FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own rules"
  ON public.automation_rules FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- PLATFORM HEALTH
-- ============================================================
CREATE POLICY "Users can view health of own accounts"
  ON public.platform_health FOR SELECT
  USING (
    social_account_id IN (
      SELECT id FROM public.social_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages health"
  ON public.platform_health FOR ALL
  USING (auth.role() = 'service_role');
