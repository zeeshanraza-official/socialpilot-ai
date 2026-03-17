import { createClient } from "@/lib/supabase/server";
import type { User } from "@/types";

export interface AuthContext {
  user: User;
  userId: string;
}

/**
 * Get the authenticated user from the current request
 * Throws if not authenticated
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    throw new AuthError("Unauthorized");
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (userError || !user) {
    throw new AuthError("User profile not found");
  }

  return { user: user as User, userId: user.id };
}

/**
 * Verify that a user owns a specific brand
 */
export async function requireBrandOwnership(
  userId: string,
  brandId: string
): Promise<void> {
  const supabase = await createClient();

  const { data: brand, error } = await supabase
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .eq("user_id", userId)
    .single();

  if (error || !brand) {
    throw new ForbiddenError("You do not have access to this brand");
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
