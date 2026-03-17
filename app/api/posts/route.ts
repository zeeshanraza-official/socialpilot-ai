import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, requireBrandOwnership } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse, rateLimitResponse } from "@/lib/api/response";
import { createContentSchema, checkBannedWords, isDuplicateContent } from "@/lib/security/validate";
import { writeAuditLog } from "@/lib/audit/logger";
import { apiLimiter, getClientIp } from "@/lib/security/rate-limit";

// GET /api/posts - List content items with filters
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthContext();
    const { searchParams } = new URL(request.url);

    const brand_id = searchParams.get("brand_id");
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const page = parseInt(searchParams.get("page") || "1");
    const per_page = Math.min(parseInt(searchParams.get("per_page") || "20"), 100);
    const offset = (page - 1) * per_page;

    const supabase = await createClient();
    let query = supabase
      .from("content_items")
      .select(
        `
        *,
        media_assets(id, cdn_url, thumbnail_cdn_url, file_type),
        scheduled_posts(id, platform, status, scheduled_at, published_at, platform_post_url)
      `,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + per_page - 1);

    if (brand_id) query = query.eq("brand_id", brand_id);
    if (status) query = query.eq("status", status);
    if (platform) query = query.contains("target_platforms", [platform]);

    const { data, count, error } = await query;
    if (error) throw error;

    return successResponse({
      data: data || [],
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}

// POST /api/posts - Create a content item
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limit = apiLimiter(`create-post:${ip}`);
    if (!limit.success) return rateLimitResponse(limit.retryAfter || 60);

    const { userId } = await getAuthContext();
    const body = await request.json();

    // Validate input
    const parsed = createContentSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.errors.map((e) => e.message).join(", "), 422);
    }

    const data = parsed.data;

    // Verify brand ownership
    await requireBrandOwnership(userId, data.brand_id);

    const supabase = await createClient();

    // Fetch brand for content rules
    const { data: brand } = await supabase
      .from("brands")
      .select("banned_words, require_approval")
      .eq("id", data.brand_id)
      .single();

    // Check banned words
    if (brand && data.caption) {
      const violations = checkBannedWords(data.caption, brand.banned_words || []);
      if (violations.length > 0) {
        return errorResponse(
          `Content contains banned words: ${violations.join(", ")}`,
          422,
          "BANNED_WORDS"
        );
      }
    }

    // Check for duplicate content (last 24 hours)
    if (data.caption) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentPosts } = await supabase
        .from("content_items")
        .select("caption")
        .eq("brand_id", data.brand_id)
        .gt("created_at", yesterday)
        .not("caption", "is", null);

      const recentCaptions = (recentPosts || []).map((p) => p.caption).filter(Boolean);
      if (isDuplicateContent(data.caption, recentCaptions)) {
        return errorResponse("This content is too similar to a recently created post", 422, "DUPLICATE_CONTENT");
      }
    }

    // Determine initial status
    const initialStatus = brand?.require_approval ? "pending_review" : "draft";

    const { data: contentItem, error } = await supabase
      .from("content_items")
      .insert({
        user_id: userId,
        status: initialStatus,
        ...data,
      })
      .select(`
        *,
        media_assets(id, cdn_url, file_type)
      `)
      .single();

    if (error) throw error;

    // If scheduled, create scheduled_posts records
    if (data.scheduled_at && (initialStatus === "draft" || !brand?.require_approval)) {
      await createScheduledPosts(supabase, contentItem, userId, data.scheduled_at);
    }

    await writeAuditLog({
      user_id: userId,
      brand_id: data.brand_id,
      action: "content.create",
      entity_type: "content_item",
      entity_id: contentItem.id,
      details: {
        platforms: data.target_platforms,
        status: initialStatus,
        scheduled_at: data.scheduled_at,
      },
      ip_address: ip,
    });

    return successResponse(contentItem, 201);
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    if ((error as Error).name === "ForbiddenError") return errorResponse("Access denied", 403);
    return errorResponse((error as Error).message || "Failed to create post", 500);
  }
}

async function createScheduledPosts(
  supabase: ReturnType<Awaited<ReturnType<typeof createClient>>["from"]> extends never ? never : ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  contentItem: Record<string, unknown>,
  userId: string,
  scheduledAt: string
) {
  const { data: accounts } = await (supabase as ReturnType<Awaited<ReturnType<typeof createClient>>["from"]> extends never ? never : ReturnType<typeof createClient> extends Promise<infer T> ? T : never)
    .from("social_accounts")
    .select("id, platform")
    .in("id", (contentItem.target_account_ids as string[]) || [])
    .eq("status", "active");

  if (!accounts?.length) return;

  const scheduledPostRecords = accounts.map((account: { id: string; platform: string }) => ({
    content_item_id: contentItem.id,
    brand_id: contentItem.brand_id,
    user_id: userId,
    social_account_id: account.id,
    platform: account.platform,
    scheduled_at: scheduledAt,
    timezone: (contentItem.timezone as string) || "UTC",
    status: "pending",
  }));

  await (supabase as ReturnType<Awaited<ReturnType<typeof createClient>>["from"]> extends never ? never : ReturnType<typeof createClient> extends Promise<infer T> ? T : never)
    .from("scheduled_posts")
    .insert(scheduledPostRecords);
}
