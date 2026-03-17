import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse, rateLimitResponse } from "@/lib/api/response";
import { generateReplySchema } from "@/lib/security/validate";
import { generateReplySuggestions } from "@/lib/openai/client";
import { aiLimiter, getClientIp } from "@/lib/security/rate-limit";
import type { Brand, InboxMessage } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { userId } = await getAuthContext();

    const limit = aiLimiter(`reply:${userId}`);
    if (!limit.success) return rateLimitResponse(limit.retryAfter || 60);

    const body = await request.json();
    const parsed = generateReplySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input", 422);
    }

    const supabase = await createClient();

    // Get brand
    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", parsed.data.brand_id)
      .eq("user_id", userId)
      .single();

    if (!brand) return errorResponse("Brand not found", 404);

    // Get message
    const { data: message } = await supabase
      .from("inbox_messages")
      .select("*")
      .eq("id", parsed.data.message_id)
      .eq("user_id", userId)
      .single();

    if (!message) return errorResponse("Message not found", 404);

    const suggestions = await generateReplySuggestions({
      brand: brand as Brand,
      message: message as InboxMessage,
    });

    // Store suggestions on the message
    await supabase
      .from("inbox_messages")
      .update({ ai_reply_suggestions: suggestions })
      .eq("id", parsed.data.message_id);

    // Log generation
    await supabase.from("ai_generations").insert({
      brand_id: parsed.data.brand_id,
      user_id: userId,
      generation_type: "reply",
      context_data: { message_id: parsed.data.message_id, platform: message.platform },
      result: { suggestions },
      model_used: process.env.OPENAI_MODEL || "gpt-4o-mini",
      status: "completed",
    });

    return successResponse({ suggestions });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message || "AI generation failed", 500);
  }
}
