-- ============================================================
-- SOCIALPILOT AI - Database Seed (Development Only)
-- DO NOT run in production
-- ============================================================

-- Create increment function for daily post count
CREATE OR REPLACE FUNCTION public.increment_daily_post_count(account_id UUID)
RETURNS VOID AS $$
DECLARE
  current_reset TIMESTAMPTZ;
  now_time TIMESTAMPTZ := NOW();
BEGIN
  SELECT daily_post_reset_at INTO current_reset
  FROM public.social_accounts
  WHERE id = account_id;

  IF current_reset IS NULL OR current_reset < now_time THEN
    -- New day, reset counter
    UPDATE public.social_accounts
    SET daily_post_count = 1,
        daily_post_reset_at = DATE_TRUNC('day', now_time) + INTERVAL '1 day'
    WHERE id = account_id;
  ELSE
    UPDATE public.social_accounts
    SET daily_post_count = daily_post_count + 1
    WHERE id = account_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.increment_daily_post_count TO service_role;

-- ============================================================
-- STORAGE BUCKET setup (run in Supabase Storage)
-- These are SQL comments - actual bucket setup via Supabase dashboard
-- ============================================================
-- Create bucket: socialpilot-media (private)
-- Enable: Restrict public access = true
-- File size limit: 524288000 (512MB)
-- Allowed MIME types: image/*, video/*

-- ============================================================
-- CRON JOB for post processing (Supabase pg_cron)
-- ============================================================
-- SELECT cron.schedule(
--   'process-scheduled-posts',
--   '* * * * *',  -- every minute
--   $$
--   SELECT
--     net.http_post(
--       url:='https://YOUR_APP_URL/api/queue/process',
--       headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_APP_SECRET_KEY"}'::jsonb,
--       body:='{}'::jsonb
--     ) AS request_id;
--   $$
-- );
