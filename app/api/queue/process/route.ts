import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { processScheduledPost } from "@/lib/queue/publisher";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { log } from "@/lib/audit/logger";

// This endpoint is called by a cron job / external scheduler
// Protected by a secret key - NOT user-facing
export async function POST(request: NextRequest) {
  try {
    // Verify internal API key
    const authHeader = request.headers.get("authorization");
    const expectedKey = `Bearer ${process.env.APP_SECRET_KEY}`;

    if (authHeader !== expectedKey) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const { scheduled_post_id } = body;

    if (scheduled_post_id) {
      // Process specific post
      await processScheduledPost(scheduled_post_id);
      return successResponse({ processed: scheduled_post_id });
    }

    // Process all due posts
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();

    const { data: duePosts, error } = await supabase
      .from("scheduled_posts")
      .select("id, scheduled_at")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .is("next_retry_at", null)
      .limit(50);

    const { data: retryPosts } = await supabase
      .from("scheduled_posts")
      .select("id, next_retry_at")
      .eq("status", "pending")
      .lte("next_retry_at", now)
      .not("next_retry_at", "is", null)
      .limit(20);

    const allPosts = [
      ...(duePosts || []),
      ...(retryPosts || []),
    ];

    if (allPosts.length === 0) {
      return successResponse({ processed: 0, message: "No posts due" });
    }

    log("info", "Processing batch of scheduled posts", { count: allPosts.length });

    // Process concurrently with limit
    const CONCURRENCY = parseInt(process.env.QUEUE_CONCURRENCY || "5");
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (let i = 0; i < allPosts.length; i += CONCURRENCY) {
      const batch = allPosts.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map((post) => processScheduledPost(post.id))
      );

      batchResults.forEach((result, idx) => {
        results.push({
          id: batch[idx].id,
          success: result.status === "fulfilled",
          error: result.status === "rejected" ? (result.reason as Error).message : undefined,
        });
      });
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return successResponse({
      processed: allPosts.length,
      succeeded,
      failed,
      results,
    });
  } catch (error: unknown) {
    log("error", "Queue processor failed", { error: (error as Error).message });
    return errorResponse((error as Error).message || "Queue processing failed", 500);
  }
}

// GET - Health check for the queue
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.APP_SECRET_KEY}`) {
    return errorResponse("Unauthorized", 401);
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const [pendingResult, processingResult, failedResult] = await Promise.all([
    supabase.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "processing"),
    supabase.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "failed").gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  return successResponse({
    status: "healthy",
    queue: {
      pending: pendingResult.count || 0,
      processing: processingResult.count || 0,
      failed_24h: failedResult.count || 0,
    },
    timestamp: now,
  });
}
