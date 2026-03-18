import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { AdminSidebar } from "./admin-sidebar";

async function getAdminEmail(): Promise<string | null> {
  const configured = process.env.ADMIN_EMAIL;
  if (configured) return configured;

  // Fall back to the first registered user (app owner)
  const db = createServiceRoleClient();
  const { data } = await db
    .from("users")
    .select("email")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  return data ? (data as { email: string }).email : null;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const { data: user } = await supabase
    .from("users")
    .select("email, full_name")
    .eq("id", authUser.id)
    .single();

  const adminEmail = await getAdminEmail();

  if (!adminEmail || user?.email !== adminEmail) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <AdminSidebar adminEmail={user.email} adminName={user.full_name} />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  );
}
