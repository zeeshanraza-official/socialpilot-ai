import { getAuthContext } from "@/lib/api/auth";
import { ForbiddenError } from "@/lib/api/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Determine if a user email has admin access.
 *
 * Priority:
 *   1. If ADMIN_EMAIL env var is set → only that email is admin.
 *   2. Otherwise → the earliest registered user (app owner) is admin.
 */
async function resolveAdminEmail(): Promise<string> {
  const configured = process.env.ADMIN_EMAIL;
  if (configured) return configured;

  // Fall back to the first registered user
  const db = createServiceRoleClient();
  const { data } = await db
    .from("users")
    .select("email")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (!data) throw new ForbiddenError("No users found");
  return (data as { email: string }).email;
}

export async function requireAdminAuth() {
  const { user } = await getAuthContext();
  const adminEmail = await resolveAdminEmail();

  if (user.email !== adminEmail) {
    throw new ForbiddenError("Admin access required");
  }

  return { user };
}

export async function isAdmin(): Promise<boolean> {
  try {
    await requireAdminAuth();
    return true;
  } catch {
    return false;
  }
}
