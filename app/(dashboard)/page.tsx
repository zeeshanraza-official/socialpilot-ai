import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardOverview } from "./dashboard-overview";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Load dashboard data
  const [brandsResult, postsResult, inboxResult] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, color, slug, social_accounts(platform, status)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(6),

    supabase
      .from("scheduled_posts")
      .select("id, platform, status, scheduled_at, content_item:content_items(caption)")
      .eq("user_id", user.id)
      .in("status", ["pending", "published"])
      .order("scheduled_at", { ascending: true })
      .limit(10),

    supabase
      .from("inbox_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "unread"),
  ]);

  const now = new Date();
  const upcomingPosts = (postsResult.data || []).filter(
    (p) => p.status === "pending" && new Date(p.scheduled_at) > now
  );
  const recentPublished = (postsResult.data || []).filter(
    (p) => p.status === "published"
  );

  return (
    <DashboardOverview
      brands={brandsResult.data || []}
      upcomingPosts={upcomingPosts}
      recentPublished={recentPublished}
      unreadCount={inboxResult.count || 0}
    />
  );
}
