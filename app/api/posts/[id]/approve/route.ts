import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api/response";
import { writeAuditLog } from "@/lib/audit/logger";

// POST /api/posts/[id]/approve
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await getAuthContext();
    const body = await request.json();
    const action = body.action as "approve" | "reject";
    const rejectionReason = body.rejection_reason as string | undefined;

    if (!["approve", "reject"].includes(action)) {
      return errorResponse("Action must be 'approve' or 'reject'", 422);
    }

    const supabase = await createClient();

    const { data: post } = await supabase
      .from("content_items")
      .select("id, status, brand_id, scheduled_at, timezone, target_account_ids")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();

    if (!post) return notFoundResponse("Post");

    if (post.status !== "pending_review") {
      return errorResponse("Post is not pending review", 400);
    }

    if (action === "approve") {
      const newStatus = post.scheduled_at ? "scheduled" : "approved";

      await supabase
        .from("content_items")
        .update({ status: newStatus })
        .eq("id", params.id);

      // Create scheduled_posts if scheduled
      if (post.scheduled_at) {
        const { data: accounts } = await supabase
          .from("social_accounts")
          .select("id, platform")
          .in("id", post.target_account_ids || [])
          .eq("status", "active");

        if (accounts?.length) {
          await supabase.from("scheduled_posts").insert(
            accounts.map((acc: { id: string; platform: string }) => ({
              content_item_id: params.id,
              brand_id: post.brand_id,
              user_id: userId,
              social_account_id: acc.id,
              platform: acc.platform,
              scheduled_at: post.scheduled_at,
              timezone: post.timezone,
              status: "pending",
            }))
          );
        }
      }

      await writeAuditLog({
        user_id: userId,
        brand_id: post.brand_id,
        action: "content.approve",
        entity_type: "content_item",
        entity_id: params.id,
      });

      return successResponse({ status: newStatus });
    } else {
      await supabase
        .from("content_items")
        .update({ status: "rejected", rejection_reason: rejectionReason || null })
        .eq("id", params.id);

      await writeAuditLog({
        user_id: userId,
        brand_id: post.brand_id,
        action: "content.reject",
        entity_type: "content_item",
        entity_id: params.id,
        details: { reason: rejectionReason },
      });

      return successResponse({ status: "rejected" });
    }
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}
