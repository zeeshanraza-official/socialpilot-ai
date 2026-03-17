import { createServiceRoleClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/security/encryption";
import { writeAuditLog, log } from "@/lib/audit/logger";
import { generateDownloadUrl } from "@/lib/s3/client";
import * as facebook from "@/lib/social/facebook";
import * as instagram from "@/lib/social/instagram";
import * as linkedin from "@/lib/social/linkedin";
import * as youtube from "@/lib/social/youtube";
import type { ContentItem, SocialAccount, Platform, PublishResult } from "@/types";

// Server-side extension — encrypted token fields are never sent to the frontend
type SocialAccountWithTokens = SocialAccount & {
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
};

// Circuit breaker thresholds
const CIRCUIT_OPEN_THRESHOLD = 5;   // errors before open
const CIRCUIT_OPEN_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Process a single scheduled post
 * This is the core publishing engine
 */
export async function processScheduledPost(scheduled_post_id: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const startTime = Date.now();

  log("info", "Processing scheduled post", { scheduled_post_id });

  // 1. Load scheduled post with all relations
  const { data: scheduledPost, error: loadError } = await supabase
    .from("scheduled_posts")
    .select(`
      *,
      content_item:content_items(*),
      social_account:social_accounts(*)
    `)
    .eq("id", scheduled_post_id)
    .single();

  if (loadError || !scheduledPost) {
    log("error", "Failed to load scheduled post", { scheduled_post_id, error: loadError?.message });
    return;
  }

  if (scheduledPost.status !== "pending" && scheduledPost.status !== "processing") {
    log("warn", "Scheduled post is not in pending state", {
      scheduled_post_id,
      status: scheduledPost.status,
    });
    return;
  }

  const account: SocialAccountWithTokens = scheduledPost.social_account as SocialAccountWithTokens;
  const content: ContentItem = scheduledPost.content_item;

  // 2. Check circuit breaker
  const circuitOpen = await isCircuitOpen(account.id, supabase);
  if (circuitOpen) {
    await failPost(supabase, scheduled_post_id, "Circuit breaker open - too many recent failures");
    return;
  }

  // 3. Check account status
  if (account.status !== "active") {
    await failPost(supabase, scheduled_post_id, `Account is ${account.status}`);
    return;
  }

  // 4. Mark as processing
  await supabase
    .from("scheduled_posts")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", scheduled_post_id);

  // 5. Decrypt access token (server-side only)
  let accessToken: string;
  try {
    accessToken = decryptToken(account.access_token_encrypted!);
  } catch {
    await failPost(supabase, scheduled_post_id, "Failed to decrypt access token", "AUTH_ERROR");
    return;
  }

  // 6. Check if token needs refresh
  if (account.token_expires_at) {
    const expiresAt = new Date(account.token_expires_at);
    const bufferTime = 5 * 60 * 1000; // 5 min buffer
    if (expiresAt.getTime() - bufferTime < Date.now()) {
      accessToken = await refreshTokenIfNeeded(account, supabase) || accessToken;
    }
  }

  // 7. Resolve media URLs
  const mediaUrls: string[] = [];
  if (content.media_asset_ids && content.media_asset_ids.length > 0) {
    const { data: assets } = await supabase
      .from("media_assets")
      .select("s3_key, cdn_url, file_type")
      .in("id", content.media_asset_ids);

    if (assets) {
      for (const asset of assets) {
        // Generate signed URL for private S3 access
        const url = asset.cdn_url || (await generateDownloadUrl(asset.s3_key, 3600));
        mediaUrls.push(url);
      }
    }
  }

  // 8. Platform-specific content validation
  const validationError = validateContentForPlatform(content, scheduledPost.platform as Platform, mediaUrls);
  if (validationError) {
    await failPost(supabase, scheduled_post_id, validationError);
    return;
  }

  // 9. Publish to platform
  let result: PublishResult;
  try {
    result = await publishToPlatform(
      scheduledPost.platform as Platform,
      account,
      accessToken,
      content,
      mediaUrls
    );
  } catch (error: unknown) {
    result = {
      success: false,
      error: (error as Error).message || "Unknown publish error",
    };
  }

  const duration_ms = Date.now() - startTime;

  // 10. Log the publish job
  await supabase.from("publish_jobs").insert({
    scheduled_post_id,
    brand_id: scheduledPost.brand_id,
    user_id: scheduledPost.user_id,
    social_account_id: account.id,
    platform: scheduledPost.platform,
    action: "publish",
    request_payload: {
      content_item_id: content.id,
      platform: scheduledPost.platform,
      has_media: mediaUrls.length > 0,
    },
    response_payload: result,
    status: result.success ? "success" : "failed",
    error_message: result.error || null,
    duration_ms,
    executed_at: new Date().toISOString(),
  });

  // 11. Update scheduled post status
  if (result.success) {
    await supabase
      .from("scheduled_posts")
      .update({
        status: "published",
        platform_post_id: result.platform_post_id || null,
        platform_post_url: result.platform_post_url || null,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", scheduled_post_id);

    // Update content item status if all posts published
    await checkAndUpdateContentStatus(supabase, content.id);

    // Reset circuit breaker success
    await recordSuccess(account.id, supabase);

    // Update daily post count
    await supabase.rpc("increment_daily_post_count", { account_id: account.id });

    log("info", "Post published successfully", {
      scheduled_post_id,
      platform: scheduledPost.platform,
      post_id: result.platform_post_id,
    });

    await writeAuditLog({
      user_id: scheduledPost.user_id,
      brand_id: scheduledPost.brand_id,
      action: "system.publish_success",
      entity_type: "scheduled_post",
      entity_id: scheduled_post_id,
      details: {
        platform: scheduledPost.platform,
        platform_post_id: result.platform_post_id,
      },
    });
  } else {
    // Handle retry logic
    const newRetryCount = (scheduledPost.retry_count || 0) + 1;

    if (newRetryCount >= scheduledPost.max_retries) {
      await failPost(supabase, scheduled_post_id, result.error || "Max retries exceeded");
    } else {
      // Exponential backoff
      const backoffMs = Math.min(
        1000 * Math.pow(2, newRetryCount),
        30 * 60 * 1000 // max 30 min
      );
      const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

      await supabase
        .from("scheduled_posts")
        .update({
          status: "pending",
          retry_count: newRetryCount,
          next_retry_at: nextRetryAt,
          error_message: result.error || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scheduled_post_id);
    }

    // Record failure for circuit breaker
    await recordFailure(account.id, result.error_code || "UNKNOWN", supabase);

    log("warn", "Post publish failed", {
      scheduled_post_id,
      platform: scheduledPost.platform,
      error: result.error,
      retry_count: newRetryCount,
    });

    await writeAuditLog({
      user_id: scheduledPost.user_id,
      brand_id: scheduledPost.brand_id,
      action: "system.publish_fail",
      entity_type: "scheduled_post",
      entity_id: scheduled_post_id,
      details: { error: result.error, error_code: result.error_code },
      success: false,
      error_message: result.error,
    });
  }
}

async function publishToPlatform(
  platform: Platform,
  account: SocialAccount,
  accessToken: string,
  content: ContentItem,
  mediaUrls: string[]
): Promise<PublishResult> {
  switch (platform) {
    case "facebook":
      return facebook.publishPost(account, accessToken, content, mediaUrls);

    case "instagram":
      return instagram.publishPost(account, accessToken, content, mediaUrls);

    case "linkedin":
      return linkedin.publishPost(account, accessToken, content, mediaUrls);

    case "youtube": {
      const ytOverride = content.platform_overrides?.youtube;
      if (mediaUrls.length > 0 && mediaUrls[0].match(/\.(mp4|mov)$/i)) {
        return youtube.publishVideo(account, accessToken, content, mediaUrls[0]);
      }
      return youtube.publishCommunityPost(account, accessToken, content);
    }

    default:
      return { success: false, error: `Unsupported platform: ${platform}` };
  }
}

function validateContentForPlatform(
  content: ContentItem,
  platform: Platform,
  mediaUrls: string[]
): string | null {
  const platformOverride = content.platform_overrides?.[platform] as { caption?: string } | undefined;
  const caption = platformOverride?.caption || content.caption || "";

  const limits: Record<Platform, number> = {
    facebook: 63206,
    instagram: 2200,
    linkedin: 3000,
    youtube: 5000,
  };

  if (caption.length > limits[platform]) {
    return `Caption exceeds ${platform} limit of ${limits[platform]} characters`;
  }

  if (platform === "instagram" && mediaUrls.length === 0) {
    return "Instagram requires at least one image or video";
  }

  return null;
}

async function failPost(
  supabase: ReturnType<typeof createServiceRoleClient>,
  scheduled_post_id: string,
  error: string,
  error_code?: string
): Promise<void> {
  await supabase
    .from("scheduled_posts")
    .update({
      status: "failed",
      error_message: error,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduled_post_id);
}

async function checkAndUpdateContentStatus(
  supabase: ReturnType<typeof createServiceRoleClient>,
  content_item_id: string
): Promise<void> {
  const { data: posts } = await supabase
    .from("scheduled_posts")
    .select("status")
    .eq("content_item_id", content_item_id);

  if (!posts) return;

  const allPublished = posts.every((p: { status: string }) => p.status === "published");
  const anyFailed = posts.some((p: { status: string }) => p.status === "failed");

  if (allPublished) {
    await supabase
      .from("content_items")
      .update({ status: "published" })
      .eq("id", content_item_id);
  } else if (anyFailed && posts.every((p: { status: string }) => ["published", "failed"].includes(p.status))) {
    await supabase
      .from("content_items")
      .update({ status: "failed" })
      .eq("id", content_item_id);
  }
}

async function isCircuitOpen(
  social_account_id: string,
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<boolean> {
  const { data: health } = await supabase
    .from("platform_health")
    .select("state, next_test_at")
    .eq("social_account_id", social_account_id)
    .single();

  if (!health) return false;
  if (health.state === "closed") return false;
  if (health.state === "open") {
    if (health.next_test_at && new Date(health.next_test_at) <= new Date()) {
      // Transition to half_open
      await supabase
        .from("platform_health")
        .update({ state: "half_open" })
        .eq("social_account_id", social_account_id);
      return false;
    }
    return true;
  }
  return false; // half_open = allow one test request
}

async function recordFailure(
  social_account_id: string,
  error_code: string,
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<void> {
  const { data: health } = await supabase
    .from("platform_health")
    .upsert(
      {
        social_account_id,
        failure_count: 1,
        last_failure_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "social_account_id" }
    )
    .select()
    .single();

  if (!health) return;

  const newFailureCount = (health.failure_count || 0) + 1;

  if (newFailureCount >= CIRCUIT_OPEN_THRESHOLD || error_code === "AUTH_ERROR") {
    await supabase
      .from("platform_health")
      .update({
        state: "open",
        failure_count: newFailureCount,
        opened_at: new Date().toISOString(),
        next_test_at: new Date(Date.now() + CIRCUIT_OPEN_DURATION_MS).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("social_account_id", social_account_id);

    // Pause the account
    await supabase
      .from("social_accounts")
      .update({ status: "paused", last_error: `Circuit breaker opened: ${error_code}` })
      .eq("id", social_account_id);

    log("warn", "Circuit breaker opened", { social_account_id, failure_count: newFailureCount });
  } else {
    await supabase
      .from("platform_health")
      .update({
        failure_count: newFailureCount,
        last_failure_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("social_account_id", social_account_id);
  }
}

async function recordSuccess(
  social_account_id: string,
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<void> {
  await supabase
    .from("platform_health")
    .upsert(
      {
        social_account_id,
        state: "closed",
        failure_count: 0,
        success_count: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "social_account_id" }
    );
}

async function refreshTokenIfNeeded(
  account: SocialAccountWithTokens,
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<string | null> {
  if (!account.refresh_token_encrypted) return null;

  try {
    const { encryptToken, decryptToken } = await import("@/lib/security/encryption");
    const refreshToken = decryptToken(account.refresh_token_encrypted as string);
    let newToken: string | null = null;
    let newExpiry: Date | null = null;

    if (account.platform === "linkedin") {
      const result = await linkedin.refreshToken(refreshToken);
      newToken = result.access_token;
      newExpiry = new Date(Date.now() + result.expires_in * 1000);
    } else if (account.platform === "youtube") {
      const result = await youtube.refreshAccessToken(refreshToken);
      newToken = result.access_token;
      newExpiry = new Date(Date.now() + result.expires_in * 1000);
    }

    if (newToken && newExpiry) {
      await supabase
        .from("social_accounts")
        .update({
          access_token_encrypted: encryptToken(newToken),
          token_expires_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);

      return newToken;
    }
  } catch (error) {
    log("error", "Token refresh failed", { account_id: account.id, error: (error as Error).message });
  }

  return null;
}
