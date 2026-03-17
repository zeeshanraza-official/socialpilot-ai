import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnalyticsPageClient } from "./analytics-client";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { brand_id?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, color")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("name");

  return (
    <AnalyticsPageClient
      brands={brands || []}
      initialBrandId={searchParams.brand_id}
    />
  );
}
