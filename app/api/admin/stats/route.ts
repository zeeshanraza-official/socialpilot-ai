import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/api/admin-auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/api/response";
import { AuthError, ForbiddenError } from "@/lib/api/auth";

export async function GET() {
  try {
    await requireAdminAuth();
    const db = createServiceRoleClient();

    const [
      usersResult,
      brandsResult,
      pendingPostsResult,
      publishedTodayResult,
      publishedTotalResult,
      aiGenResult,
    ] = await Promise.all([
      db.from("users").select("id", { count: "exact", head: true }),
      db.from("brands").select("id", { count: "exact", head: true }),
      db.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db.from("scheduled_posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .gte("scheduled_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      db.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "published"),
      db.from("ai_generations").select("id", { count: "exact", head: true }),
    ]);

    // Recent signups: last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentUsers } = await db
      .from("users")
      .select("id, email, full_name, plan, created_at")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(10);

    // Plan breakdown
    const { data: planData } = await db
      .from("users")
      .select("plan");

    const planBreakdown: Record<string, number> = {};
    ((planData as { plan: string }[]) || []).forEach((u) => {
      planBreakdown[u.plan] = (planBreakdown[u.plan] || 0) + 1;
    });

    return NextResponse.json({
      data: {
        totals: {
          users: usersResult.count ?? 0,
          brands: brandsResult.count ?? 0,
          pendingPosts: pendingPostsResult.count ?? 0,
          publishedToday: publishedTodayResult.count ?? 0,
          publishedTotal: publishedTotalResult.count ?? 0,
          aiGenerations: aiGenResult.count ?? 0,
        },
        planBreakdown,
        recentUsers: recentUsers ?? [],
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
