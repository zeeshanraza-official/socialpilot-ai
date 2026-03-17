import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, requireBrandOwnership } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse, rateLimitResponse } from "@/lib/api/response";
import { generateCaptionSchema } from "@/lib/security/validate";
import { generateCaption } from "@/lib/openai/client";
import { aiLimiter, getClientIp } from "@/lib/security/rate-limit";
import { writeAuditLog } from "@/lib/audit/logger";
import type { Brand } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { userId } = await getAuthContext();

    // AI-specific rate limiting
    const limit = aiLimiter(`caption:${userId}`);
    if (!limit.success) return rateLimitResponse(limit.retryAfter || 60);

    const body = await request.json();
    const parsed = generateCaptionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.errors.map((e) => e.message).join(", "), 422);
    }

    await requireBrandOwnership(userId, parsed.data.brand_id);

    const supabase = await createClient();
    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", parsed.data.brand_id)
      .single();

    if (!brand) return errorResponse("Brand not found", 404);

    const startTime = Date.now();
    const result = await generateCaption({
      brand: brand as Brand,
      topic: parsed.data.topic,
      platform: parsed.data.platform,
      keywords: parsed.data.keywords,
      target_audience: parsed.data.target_audience,
      include_cta: parsed.data.include_cta,
    });
    const duration_ms = Date.now() - startTime;

    // Log AI generation
    const { data: generation } = await supabase
      .from("ai_generations")
      .insert({
        brand_id: parsed.data.brand_id,
        user_id: userId,
        generation_type: "caption",
        prompt: parsed.data.topic,
        context_data: {
          platform: parsed.data.platform,
          keywords: parsed.data.keywords,
          target_audience: parsed.data.target_audience,
        },
        result,
        model_used: process.env.OPENAI_MODEL || "gpt-4o-mini",
        status: "completed",
        duration_ms,
      })
      .select("id")
      .single();

    await writeAuditLog({
      user_id: userId,
      brand_id: parsed.data.brand_id,
      action: "ai.generate",
      entity_type: "ai_generation",
      entity_id: generation?.id,
      details: { type: "caption", platform: parsed.data.platform },
      ip_address: ip,
    });

    return successResponse({
      ...result,
      generation_id: generation?.id,
    });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    if ((error as Error).name === "ForbiddenError") return errorResponse("Access denied", 403);
    return errorResponse((error as Error).message || "AI generation failed", 500);
  }
}
