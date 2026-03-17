import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api/response";
import { replyToMessageSchema } from "@/lib/security/validate";
import { writeAuditLog } from "@/lib/audit/logger";
import { decryptToken } from "@/lib/security/encryption";
import { createServiceRoleClient } from "@/lib/supabase/server";
import axios from "axios";

const FB_API = "https://graph.facebook.com/v21.0";

// POST /api/inbox/reply - Send a reply to an inbox message
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthContext();
    const body = await request.json();

    const parsed = replyToMessageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.errors.map((e) => e.message).join(", "), 422);
    }

    const { message_id, content, was_ai_suggested } = parsed.data;

    const supabase = await createClient();

    // Load message with account
    const { data: message } = await supabase
      .from("inbox_messages")
      .select(`
        *,
        social_account:social_accounts(*)
      `)
      .eq("id", message_id)
      .eq("user_id", userId)
      .single();

    if (!message) return errorResponse("Message not found", 404);

    // Load brand to check approval requirements
    const { data: brand } = await supabase
      .from("brands")
      .select("require_approval, banned_words")
      .eq("id", message.brand_id)
      .single();

    // Check banned words
    if (brand && brand.banned_words?.length > 0) {
      const { checkBannedWords } = await import("@/lib/security/validate");
      const violations = checkBannedWords(content, brand.banned_words);
      if (violations.length > 0) {
        return errorResponse(`Reply contains banned words: ${violations.join(", ")}`, 422);
      }
    }

    // Determine status based on approval requirements
    const replyStatus = brand?.require_approval ? "pending" : "approved";

    // Create reply record
    const { data: reply } = await supabase
      .from("inbox_replies")
      .insert({
        message_id,
        brand_id: message.brand_id,
        user_id: userId,
        social_account_id: message.social_account_id,
        platform: message.platform,
        content,
        was_ai_suggested: was_ai_suggested || false,
        status: replyStatus,
        approved_by: replyStatus === "approved" ? userId : null,
        approved_at: replyStatus === "approved" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    // If auto-approved, publish immediately
    if (replyStatus === "approved") {
      await publishReply(reply!, message, userId);
    }

    await writeAuditLog({
      user_id: userId,
      brand_id: message.brand_id,
      action: "inbox.reply",
      entity_type: "inbox_reply",
      entity_id: reply?.id,
      details: {
        message_type: message.message_type,
        platform: message.platform,
        was_ai_suggested,
        status: replyStatus,
      },
    });

    return successResponse({ reply, status: replyStatus });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}

async function publishReply(
  reply: Record<string, unknown>,
  message: Record<string, unknown>,
  userId: string
) {
  const serviceSupabase = createServiceRoleClient();
  const account = message.social_account as Record<string, unknown>;
  if (!account?.access_token_encrypted) return;

  try {
    const accessToken = decryptToken(account.access_token_encrypted as string);

    let published = false;
    let platformReplyId: string | undefined;

    if (message.platform === "facebook" || message.platform === "instagram") {
      // Facebook/Instagram comment reply
      const response = await axios.post(
        `${FB_API}/${message.platform_message_id}/comments`,
        { message: reply.content, access_token: accessToken }
      );
      published = true;
      platformReplyId = response.data.id;
    }

    await serviceSupabase
      .from("inbox_replies")
      .update({
        status: published ? "published" : "failed",
        platform_reply_id: platformReplyId,
        published_at: published ? new Date().toISOString() : null,
      })
      .eq("id", reply.id);

    // Mark original message as replied
    if (published) {
      await serviceSupabase
        .from("inbox_messages")
        .update({ status: "replied", replied_at: new Date().toISOString() })
        .eq("id", message.id);
    }
  } catch (error) {
    await serviceSupabase
      .from("inbox_replies")
      .update({ status: "failed", error_message: (error as Error).message })
      .eq("id", reply.id);
  }
}
