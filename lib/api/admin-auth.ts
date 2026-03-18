import { getAuthContext } from "@/lib/api/auth";
import { ForbiddenError } from "@/lib/api/auth";

/**
 * Verify the current request comes from the configured admin.
 * Set ADMIN_EMAIL in your environment variables to designate the admin account.
 */
export async function requireAdminAuth() {
  const { user } = await getAuthContext();
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    throw new ForbiddenError("ADMIN_EMAIL is not configured");
  }

  if (user.email !== adminEmail) {
    throw new ForbiddenError("Admin access required");
  }

  return { user };
}

/**
 * Server-side check for admin status (use in layouts/pages).
 * Returns true if the current user is the admin.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    await requireAdminAuth();
    return true;
  } catch {
    return false;
  }
}
