import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api/response";

// GET /api/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthContext();
    const { searchParams } = new URL(request.url);

    const brand_id = searchParams.get("brand_id");
    const platform = searchParams.get("platform");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    const granularity = searchParams.get("granularity") || "daily"; // daily, weekly, monthly

    const supabase = await createClient();
    let query = supabase
      .from("analytics")
      .select("*")
      .eq("user_id", userId)
      .order("recorded_date", { ascending: true });

    if (brand_id) query = query.eq("brand_id", brand_id);
    if (platform) query = query.eq("platform", platform);
    if (start_date) query = query.gte("recorded_date", start_date);
    if (end_date) query = query.lte("recorded_date", end_date);

    const { data: analytics, error } = await query;
    if (error) throw error;

    // Aggregate metrics
    const totals = {
      impressions: 0,
      reach: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      video_views: 0,
      followers_gained: 0,
      followers_lost: 0,
      posts_count: new Set<string>(),
    };

    for (const row of analytics || []) {
      totals.impressions += row.impressions || 0;
      totals.reach += row.reach || 0;
      totals.likes += row.likes || 0;
      totals.comments += row.comments || 0;
      totals.shares += row.shares || 0;
      totals.saves += row.saves || 0;
      totals.clicks += row.clicks || 0;
      totals.video_views += row.video_views || 0;
      totals.followers_gained += row.followers_gained || 0;
      totals.followers_lost += row.followers_lost || 0;
      if (row.scheduled_post_id) totals.posts_count.add(row.scheduled_post_id);
    }

    // Platform breakdown
    const platformBreakdown: Record<string, {
      impressions: number;
      reach: number;
      engagement: number;
      posts: number;
    }> = {};

    for (const row of analytics || []) {
      if (!platformBreakdown[row.platform]) {
        platformBreakdown[row.platform] = { impressions: 0, reach: 0, engagement: 0, posts: 0 };
      }
      platformBreakdown[row.platform].impressions += row.impressions || 0;
      platformBreakdown[row.platform].reach += row.reach || 0;
      platformBreakdown[row.platform].engagement +=
        (row.likes || 0) + (row.comments || 0) + (row.shares || 0);
      if (row.scheduled_post_id) platformBreakdown[row.platform].posts++;
    }

    // Timeline data (for charts)
    const timeline = (analytics || []).reduce(
      (acc, row) => {
        const date = row.recorded_date;
        if (!acc[date]) {
          acc[date] = {
            date,
            impressions: 0,
            reach: 0,
            likes: 0,
            comments: 0,
            engagement: 0,
          };
        }
        acc[date].impressions += row.impressions || 0;
        acc[date].reach += row.reach || 0;
        acc[date].likes += row.likes || 0;
        acc[date].comments += row.comments || 0;
        acc[date].engagement +=
          (row.likes || 0) + (row.comments || 0) + (row.shares || 0);
        return acc;
      },
      {} as Record<string, {
        date: string;
        impressions: number;
        reach: number;
        likes: number;
        comments: number;
        engagement: number;
      }>
    );

    // Best performing posts
    const { data: topPosts } = await supabase
      .from("analytics")
      .select(`
        *,
        scheduled_post:scheduled_posts(
          platform_post_url,
          content_item:content_items(caption, title)
        )
      `)
      .eq("user_id", userId)
      .eq("brand_id", brand_id || "")
      .order("impressions", { ascending: false })
      .limit(5);

    const totalFollowerChange = totals.followers_gained - totals.followers_lost;
    const totalEngagement =
      totals.likes + totals.comments + totals.shares + totals.saves;
    const avgEngagementRate =
      totals.reach > 0 ? ((totalEngagement / totals.reach) * 100).toFixed(2) : "0";

    return successResponse({
      summary: {
        impressions: totals.impressions,
        reach: totals.reach,
        likes: totals.likes,
        comments: totals.comments,
        shares: totals.shares,
        saves: totals.saves,
        clicks: totals.clicks,
        video_views: totals.video_views,
        follower_change: totalFollowerChange,
        posts_count: totals.posts_count.size,
        engagement_rate: parseFloat(avgEngagementRate),
      },
      timeline: Object.values(timeline),
      platform_breakdown: platformBreakdown,
      top_posts: topPosts || [],
    });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}
