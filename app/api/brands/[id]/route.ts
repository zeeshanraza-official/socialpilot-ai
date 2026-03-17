import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from "@/lib/api/response";
import { createBrandSchema } from "@/lib/security/validate";
import { writeAuditLog } from "@/lib/audit/logger";

// GET /api/brands/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await getAuthContext();
    const supabase = await createClient();

    const { data: brand, error } = await supabase
      .from("brands")
      .select(`
        *,
        social_accounts(*),
        content_items(id, status)
      `)
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();

    if (error || !brand) return notFoundResponse("Brand");

    return successResponse(brand);
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}

// PATCH /api/brands/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await getAuthContext();
    const body = await request.json();

    const parsed = createBrandSchema.partial().safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input", 422);
    }

    const supabase = await createClient();

    const { data: brand, error } = await supabase
      .from("brands")
      .update(parsed.data)
      .eq("id", params.id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error || !brand) return notFoundResponse("Brand");

    await writeAuditLog({
      user_id: userId,
      brand_id: params.id,
      action: "brand.update",
      entity_type: "brand",
      entity_id: params.id,
      details: { updated_fields: Object.keys(parsed.data) },
    });

    return successResponse(brand);
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}

// DELETE /api/brands/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await getAuthContext();
    const supabase = await createClient();

    // Verify ownership before delete
    const { data: brand } = await supabase
      .from("brands")
      .select("id, name")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single();

    if (!brand) return notFoundResponse("Brand");

    const { error } = await supabase
      .from("brands")
      .delete()
      .eq("id", params.id)
      .eq("user_id", userId);

    if (error) throw error;

    await writeAuditLog({
      user_id: userId,
      action: "brand.delete",
      entity_type: "brand",
      entity_id: params.id,
      details: { name: brand.name },
    });

    return successResponse({ deleted: true });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}
