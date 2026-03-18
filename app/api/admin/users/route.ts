import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/api/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/api/response";
import { AuthError, ForbiddenError } from "@/lib/api/auth";

export async function GET(request: NextRequest) {
  try {
    await requireAdminAuth();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const offset = (page - 1) * limit;

    const db = createServiceRoleClient();

    const { data: users, count, error } = await db
      .from("users")
      .select(`
        id, email, full_name, avatar_url, plan, timezone,
        onboarding_completed, created_at, updated_at
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Get brand count per user
    const userIds = (users || []).map((u) => u.id);
    const { data: brandCounts } = await db
      .from("brands")
      .select("user_id")
      .in("user_id", userIds);

    const brandCountMap = (brandCounts || []).reduce<Record<string, number>>((acc, b) => {
      acc[b.user_id] = (acc[b.user_id] || 0) + 1;
      return acc;
    }, {});

    const enriched = (users || []).map((u) => ({
      ...u,
      brand_count: brandCountMap[u.id] || 0,
    }));

    return NextResponse.json({
      data: enriched,
      meta: { total: count ?? 0, page, limit, pages: Math.ceil((count ?? 0) / limit) },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
