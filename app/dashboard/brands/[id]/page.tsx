import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { BrandDetailClient } from "./brand-detail-client";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = await createClient();
  const { data: brand } = await supabase
    .from("brands")
    .select("name")
    .eq("id", params.id)
    .single();

  return { title: brand?.name || "Brand" };
}

export default async function BrandDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { connected?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: brand, error } = await supabase
    .from("brands")
    .select(`
      *,
      social_accounts(*),
      content_items(id, status, created_at)
    `)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !brand) notFound();

  // Stats
  const contentStats = {
    total: brand.content_items?.length || 0,
    published: brand.content_items?.filter((c: { status: string }) => c.status === "published").length || 0,
    scheduled: brand.content_items?.filter((c: { status: string }) => c.status === "scheduled").length || 0,
    drafts: brand.content_items?.filter((c: { status: string }) => c.status === "draft").length || 0,
  };

  return (
    <BrandDetailClient
      brand={brand}
      contentStats={contentStats}
      connectionSuccess={searchParams.connected}
    />
  );
}
