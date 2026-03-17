import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InboxPageClient } from "./inbox-client";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage({
  searchParams,
}: {
  searchParams: { brand_id?: string; type?: string };
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
    <InboxPageClient
      brands={brands || []}
      initialBrandId={searchParams.brand_id}
      initialType={searchParams.type}
    />
  );
}
