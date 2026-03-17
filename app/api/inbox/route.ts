import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api/response";
import { replyToMessageSchema } from "@/lib/security/validate";
import { writeAuditLog } from "@/lib/audit/logger";

// GET /api/inbox - List inbox messages
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthContext();
    const { searchParams } = new URL(request.url);

    const brand_id = searchParams.get("brand_id");
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const message_type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const per_page = Math.min(parseInt(searchParams.get("per_page") || "25"), 100);
    const offset = (page - 1) * per_page;

    const supabase = await createClient();
    let query = supabase
      .from("inbox_messages")
      .select(
        `
        *,
        social_account:social_accounts(id, platform, platform_account_name, avatar_url)
      `,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("platform_created_at", { ascending: false })
      .range(offset, offset + per_page - 1);

    if (brand_id) query = query.eq("brand_id", brand_id);
    if (status) query = query.eq("status", status);
    if (platform) query = query.eq("platform", platform);
    if (message_type) query = query.eq("message_type", message_type);

    const { data, count, error } = await query;
    if (error) throw error;

    // Get unread counts per type
    const { data: counts } = await supabase
      .from("inbox_messages")
      .select("message_type, status")
      .eq("user_id", userId)
      .eq("status", "unread")
      .eq("brand_id", brand_id || "");

    const unreadCounts = {
      comment: 0,
      dm: 0,
      mention: 0,
      review: 0,
      total: 0,
    };

    (counts || []).forEach((m) => {
      unreadCounts[m.message_type as keyof typeof unreadCounts] =
        (unreadCounts[m.message_type as keyof typeof unreadCounts] as number) + 1;
      unreadCounts.total++;
    });

    return successResponse({
      data: data || [],
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
      unread_counts: unreadCounts,
    });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}

// PATCH /api/inbox - Update message status
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await getAuthContext();
    const body = await request.json();
    const { message_ids, status } = body;

    if (!Array.isArray(message_ids) || message_ids.length === 0) {
      return errorResponse("message_ids array is required", 422);
    }

    const allowedStatuses = ["read", "unread", "archived", "flagged", "spam"];
    if (!allowedStatuses.includes(status)) {
      return errorResponse("Invalid status", 422);
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("inbox_messages")
      .update({ status })
      .in("id", message_ids)
      .eq("user_id", userId);

    if (error) throw error;

    return successResponse({ updated: message_ids.length });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}
