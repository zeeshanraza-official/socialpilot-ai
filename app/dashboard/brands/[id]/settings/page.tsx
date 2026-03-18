import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { BrandSettingsClient } from "./brand-settings-client";

export const metadata: Metadata = { title: "Brand Settings | SocialPilot AI" };

export default async function BrandSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: brand, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (error || !brand) notFound();

  return <BrandSettingsClient brand={brand} />;
}
