import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MediaPageClient } from "./media-client";

export const metadata: Metadata = { title: "Media Library" };

export default async function MediaPage({
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
    <MediaPageClient
      brands={brands || []}
      initialBrandId={searchParams.brand_id}
    />
  );
}
