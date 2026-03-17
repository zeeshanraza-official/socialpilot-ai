import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api/response";
import { writeAuditLog } from "@/lib/audit/logger";

// GET /api/posts/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await getAuthContext();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("content_items")
      .select(`
        *,
        brand:brands(id, name, slug, color, tone),
        media_assets(*),
        scheduled_posts(
          *,
          social_account:social_accounts(id, platform, platform_account_name, avatar_url)
        )
      `)
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();

    if (error || !data) return notFoundResponse("Post");

    return successResponse(data);
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}

// PATCH /api/posts/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await getAuthContext();
    const body = await request.json();
    const supabase = await createClient();

    // Verify ownership and get current status
    const { data: current } = await supabase
      .from("content_items")
      .select("id, status, brand_id")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();

    if (!current) return notFoundResponse("Post");

    // Prevent editing published posts
    if (["published", "publishing"].includes(current.status)) {
      return errorResponse("Cannot edit a published post", 400, "PUBLISHED_POST");
    }

    const allowedFields = [
      "caption", "hashtags", "first_comment", "platform_overrides",
      "media_asset_ids", "link_url", "scheduled_at", "timezone",
      "tags", "notes", "title",
    ];
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) updateData[field] = body[field];
    }

    const { data: updated, error } = await supabase
      .from("content_items")
      .update(updateData)
      .eq("id", params.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    await writeAuditLog({
      user_id: userId,
      brand_id: current.brand_id,
      action: "content.update",
      entity_type: "content_item",
      entity_id: params.id,
    });

    return successResponse(updated);
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}

// DELETE /api/posts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await getAuthContext();
    const supabase = await createClient();

    const { data: post } = await supabase
      .from("content_items")
      .select("id, status, brand_id")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();

    if (!post) return notFoundResponse("Post");

    if (post.status === "publishing") {
      return errorResponse("Cannot delete a post that is currently being published", 400);
    }

    // Cancel pending scheduled posts
    await supabase
      .from("scheduled_posts")
      .update({ status: "cancelled" })
      .eq("content_item_id", params.id)
      .eq("status", "pending");

    await supabase
      .from("content_items")
      .delete()
      .eq("id", params.id)
      .eq("user_id", userId);

    await writeAuditLog({
      user_id: userId,
      brand_id: post.brand_id,
      action: "content.delete",
      entity_type: "content_item",
      entity_id: params.id,
    });

    return successResponse({ deleted: true });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}
