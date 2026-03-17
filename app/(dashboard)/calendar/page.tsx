import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarPageClient } from "./calendar-client";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { brand_id?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [brandsResult, postsResult] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, color")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("scheduled_posts")
      .select(`
        id, platform, status, scheduled_at,
        content_item:content_items(id, caption, title, brand_id, media_asset_ids)
      `)
      .eq("user_id", user.id)
      .gte("scheduled_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .lte("scheduled_at", new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString())
      .order("scheduled_at"),
  ]);

  // Supabase returns joined rows as arrays; normalize to single object for one-to-one relations
  const posts = (postsResult.data || []).map((p) => ({
    ...p,
    content_item: Array.isArray(p.content_item) ? (p.content_item[0] ?? null) : p.content_item,
  }));

  return (
    <CalendarPageClient
      brands={brandsResult.data || []}
      scheduledPosts={posts}
      initialBrandId={searchParams.brand_id}
    />
  );
}
