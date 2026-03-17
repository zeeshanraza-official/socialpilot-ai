import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse, rateLimitResponse } from "@/lib/api/response";
import { createBrandSchema } from "@/lib/security/validate";
import { writeAuditLog } from "@/lib/audit/logger";
import { apiLimiter, getClientIp } from "@/lib/security/rate-limit";

// GET /api/brands - List all brands for authenticated user
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthContext();

    const supabase = await createClient();

    const { data: brands, error } = await supabase
      .from("brands")
      .select(`
        *,
        social_accounts(id, platform, platform_account_name, status, avatar_url)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return successResponse(brands || []);
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message || "Failed to fetch brands", 500);
  }
}

// POST /api/brands - Create a new brand
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const limit = apiLimiter(`create-brand:${ip}`);
    if (!limit.success) {
      return rateLimitResponse(limit.retryAfter || 60);
    }

    const { user, userId } = await getAuthContext();
    const body = await request.json();

    // Validate input
    const parsed = createBrandSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.errors.map((e) => e.message).join(", "), 422);
    }

    const data = parsed.data;
    const supabase = await createClient();

    // Check plan limits (free = 1 brand)
    if (user.plan === "free") {
      const { count } = await supabase
        .from("brands")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if ((count || 0) >= 1) {
        return errorResponse("Free plan allows only 1 brand. Upgrade to create more.", 403, "PLAN_LIMIT");
      }
    }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from("brands")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", data.slug)
      .single();

    if (existing) {
      return errorResponse("A brand with this slug already exists", 409, "SLUG_CONFLICT");
    }

    const { data: brand, error } = await supabase
      .from("brands")
      .insert({
        user_id: userId,
        ...data,
      })
      .select()
      .single();

    if (error) throw error;

    await writeAuditLog({
      user_id: userId,
      brand_id: brand.id,
      action: "brand.create",
      entity_type: "brand",
      entity_id: brand.id,
      details: { name: brand.name, slug: brand.slug },
      ip_address: ip,
    });

    return successResponse(brand, 201);
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message || "Failed to create brand", 500);
  }
}
