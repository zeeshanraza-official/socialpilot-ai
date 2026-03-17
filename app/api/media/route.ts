import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api/response";
import { deleteObject } from "@/lib/s3/client";
import { writeAuditLog } from "@/lib/audit/logger";

// GET /api/media - List media assets
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthContext();
    const { searchParams } = new URL(request.url);

    const brand_id = searchParams.get("brand_id");
    const file_type = searchParams.get("file_type");
    const folder = searchParams.get("folder");
    const page = parseInt(searchParams.get("page") || "1");
    const per_page = Math.min(parseInt(searchParams.get("per_page") || "30"), 100);
    const offset = (page - 1) * per_page;

    const supabase = await createClient();
    let query = supabase
      .from("media_assets")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(offset, offset + per_page - 1);

    if (brand_id) query = query.eq("brand_id", brand_id);
    if (file_type) query = query.eq("file_type", file_type);
    if (folder) query = query.eq("folder", folder);

    const { data, count, error } = await query;
    if (error) throw error;

    return successResponse({
      data: data || [],
      total: count || 0,
      page,
      per_page,
      total_pages: Math.ceil((count || 0) / per_page),
    });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}

// DELETE /api/media?asset_id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await getAuthContext();
    const { searchParams } = new URL(request.url);
    const asset_id = searchParams.get("asset_id");

    if (!asset_id) return errorResponse("asset_id is required", 422);

    const supabase = await createClient();
    const { data: asset } = await supabase
      .from("media_assets")
      .select("id, s3_key, brand_id")
      .eq("id", asset_id)
      .eq("user_id", userId)
      .single();

    if (!asset) return errorResponse("Asset not found", 404);

    // Soft delete (mark as deleted)
    await supabase
      .from("media_assets")
      .update({ status: "deleted" })
      .eq("id", asset_id);

    // Hard delete from S3 (async, non-blocking)
    deleteObject(asset.s3_key).catch((err) =>
      console.error("S3 delete failed:", err)
    );

    await writeAuditLog({
      user_id: userId,
      brand_id: asset.brand_id,
      action: "media.delete",
      entity_type: "media_asset",
      entity_id: asset_id,
    });

    return successResponse({ deleted: true });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}
