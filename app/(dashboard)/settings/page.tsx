import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsPageClient } from "./settings-client";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string; platform?: string };
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return (
    <SettingsPageClient
      user={user}
      connectionSuccess={searchParams.connected}
      connectionError={searchParams.error}
    />
  );
}
