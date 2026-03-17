import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BrandsPageClient } from "./brands-client";

export const metadata: Metadata = { title: "Brands" };

export default async function BrandsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: brands } = await supabase
    .from("brands")
    .select(`
      *,
      social_accounts(id, platform, platform_account_name, status, avatar_url)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return <BrandsPageClient brands={brands || []} />;
}
