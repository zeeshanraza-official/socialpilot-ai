import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, requireBrandOwnership } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse, rateLimitResponse } from "@/lib/api/response";
import { generateVariations } from "@/lib/openai/client";
import { aiLimiter, getClientIp } from "@/lib/security/rate-limit";
import type { Brand } from "@/types";

const schema = z.object({
  brand_id: z.string().uuid(),
  caption: z.string().min(1).max(5000),
  platform: z.enum(["facebook", "instagram", "linkedin", "youtube"]),
  count: z.number().int().min(1).max(5).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { userId } = await getAuthContext();

    const limit = aiLimiter(`variations:${userId}`);
    if (!limit.success) return rateLimitResponse(limit.retryAfter || 60);

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input", 422);
    }

    await requireBrandOwnership(userId, parsed.data.brand_id);

    const supabase = await createClient();
    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", parsed.data.brand_id)
      .single();

    if (!brand) return errorResponse("Brand not found", 404);

    const variations = await generateVariations({
      brand: brand as Brand,
      original_caption: parsed.data.caption,
      platform: parsed.data.platform,
      count: parsed.data.count,
    });

    await supabase.from("ai_generations").insert({
      brand_id: parsed.data.brand_id,
      user_id: userId,
      generation_type: "variation",
      prompt: parsed.data.caption.substring(0, 200),
      result: { variations },
      model_used: process.env.OPENAI_MODEL || "gpt-4o-mini",
      status: "completed",
    });

    return successResponse({ variations });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    if ((error as Error).name === "ForbiddenError") return errorResponse("Access denied", 403);
    return errorResponse((error as Error).message || "Failed", 500);
  }
}
