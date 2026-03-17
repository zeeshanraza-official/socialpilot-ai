import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ComposePageClient } from "./compose-client";

export const metadata: Metadata = { title: "Compose" };

export default async function ComposePage({
  searchParams,
}: {
  searchParams: { brand_id?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: brands } = await supabase
    .from("brands")
    .select(`
      *,
      social_accounts(id, platform, platform_account_name, status)
    `)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("name");

  return (
    <ComposePageClient
      brands={brands || []}
      initialBrandId={searchParams.brand_id}
    />
  );
}
