import { NextRequest } from "next/server";
import { getAuthContext, requireBrandOwnership } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse, rateLimitResponse } from "@/lib/api/response";
import { uploadMediaSchema } from "@/lib/security/validate";
import { generateUploadUrl, isAllowedMimeType, getFileType, MAX_FILE_SIZE } from "@/lib/s3/client";
import { uploadLimiter, getClientIp } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

// POST /api/media/upload - Get signed upload URL
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { userId } = await getAuthContext();

    const limit = uploadLimiter(`upload:${userId}`);
    if (!limit.success) return rateLimitResponse(limit.retryAfter || 60);

    const body = await request.json();
    const parsed = uploadMediaSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.errors.map((e) => e.message).join(", "), 422);
    }

    const { brand_id, filename, mime_type, file_size_bytes, alt_text, folder } = parsed.data;

    await requireBrandOwnership(userId, brand_id);

    // Validate file type
    if (!isAllowedMimeType(mime_type)) {
      return errorResponse("File type not allowed", 422, "INVALID_FILE_TYPE");
    }

    // Validate file size
    if (file_size_bytes > MAX_FILE_SIZE) {
      return errorResponse("File too large. Maximum 512MB", 422, "FILE_TOO_LARGE");
    }

    const file_type = getFileType(mime_type);
    if (!file_type) {
      return errorResponse("Unsupported file type", 422);
    }

    // Generate signed upload URL
    const { upload_url, s3_key, cdn_url } = await generateUploadUrl({
      brand_id,
      user_id: userId,
      filename,
      mime_type,
      folder: folder || "uploads",
    });

    // Pre-create media asset record (status will be confirmed after upload)
    const supabase = await createClient();
    const { data: asset } = await supabase
      .from("media_assets")
      .insert({
        brand_id,
        user_id: userId,
        filename: s3_key.split("/").pop()!,
        original_filename: filename,
        file_type,
        mime_type,
        file_size_bytes,
        s3_key,
        s3_bucket: process.env.AWS_S3_BUCKET!,
        cdn_url,
        alt_text: alt_text || null,
        folder: folder || null,
        status: "active",
      })
      .select()
      .single();

    return successResponse({
      upload_url,
      s3_key,
      cdn_url,
      asset_id: asset?.id,
      expires_in: 600,
    });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    if ((error as Error).name === "ForbiddenError") return errorResponse("Access denied", 403);
    return errorResponse((error as Error).message || "Upload failed", 500);
  }
}
