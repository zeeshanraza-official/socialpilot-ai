import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext, requireBrandOwnership } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse, rateLimitResponse } from "@/lib/api/response";
import { generateImage } from "@/lib/openai/client";
import { uploadBuffer } from "@/lib/s3/client";
import { aiLimiter, getClientIp } from "@/lib/security/rate-limit";
import { nanoid } from "nanoid";
import type { Brand } from "@/types";

const imageSchema = z.object({
  brand_id: z.string().uuid(),
  prompt: z.string().min(1).max(1000),
  size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { userId } = await getAuthContext();

    // Stricter rate limit for image gen (expensive)
    const limit = aiLimiter(`image:${userId}`);
    if (!limit.success) return rateLimitResponse(limit.retryAfter || 60);

    const body = await request.json();
    const parsed = imageSchema.safeParse(body);
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

    // Generate image
    const { url, revised_prompt } = await generateImage({
      brand: brand as Brand,
      prompt: parsed.data.prompt,
      size: parsed.data.size,
    });

    // Download and upload to S3
    const imageResponse = await fetch(url);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const s3_key = `brands/${parsed.data.brand_id}/ai-generated/${nanoid()}.png`;

    const { cdn_url } = await uploadBuffer({
      buffer: imageBuffer,
      s3_key,
      mime_type: "image/png",
      metadata: {
        user_id: userId,
        brand_id: parsed.data.brand_id,
        ai_generated: "true",
      },
    });

    // Save to media_assets
    const { data: asset } = await supabase
      .from("media_assets")
      .insert({
        brand_id: parsed.data.brand_id,
        user_id: userId,
        filename: `ai-image-${nanoid()}.png`,
        original_filename: "ai-generated.png",
        file_type: "image",
        mime_type: "image/png",
        file_size_bytes: imageBuffer.length,
        s3_key,
        s3_bucket: process.env.AWS_S3_BUCKET!,
        cdn_url,
        width: parseInt(parsed.data.size?.split("x")[0] || "1024"),
        height: parseInt(parsed.data.size?.split("x")[1] || "1024"),
        ai_generated: true,
        ai_prompt: parsed.data.prompt,
      })
      .select()
      .single();

    // Log generation
    await supabase.from("ai_generations").insert({
      brand_id: parsed.data.brand_id,
      user_id: userId,
      generation_type: "image",
      prompt: parsed.data.prompt,
      result: { cdn_url, s3_key, revised_prompt, media_asset_id: asset?.id },
      model_used: "dall-e-3",
      was_used: false,
      status: "completed",
    });

    return successResponse({
      cdn_url,
      s3_key,
      revised_prompt,
      media_asset: asset,
    });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    if ((error as Error).name === "ForbiddenError") return errorResponse("Access denied", 403);
    return errorResponse((error as Error).message || "Image generation failed", 500);
  }
}
