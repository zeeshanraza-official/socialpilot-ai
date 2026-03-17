import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/api/auth";
import { successResponse, errorResponse, unauthorizedResponse } from "@/lib/api/response";
import { generateOAuthState } from "@/lib/security/encryption";
import * as facebook from "@/lib/social/facebook";
import * as linkedin from "@/lib/social/linkedin";
import * as youtube from "@/lib/social/youtube";
import { writeAuditLog } from "@/lib/audit/logger";
import type { Platform, OAuthState } from "@/types";
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.APP_SECRET_KEY!);

// GET /api/social/connect/[platform] - Initiate OAuth
export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const { userId } = await getAuthContext();
    const { searchParams } = new URL(request.url);
    const brand_id = searchParams.get("brand_id");

    if (!brand_id) return errorResponse("brand_id is required", 422);

    const platform = params.platform as Platform;
    const validPlatforms: Platform[] = ["facebook", "instagram", "linkedin", "youtube"];

    if (!validPlatforms.includes(platform)) {
      return errorResponse("Invalid platform", 422);
    }

    // Generate CSRF state token
    const stateData: OAuthState = {
      brand_id,
      user_id: userId,
      platform,
      account_type: platform === "linkedin" ? "profile" : "page",
      timestamp: Date.now(),
    };

    // Sign state as JWT (expires in 10 min)
    const state = await new SignJWT(stateData as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("10m")
      .sign(JWT_SECRET);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const redirect_uri = `${appUrl}/api/social/callback/${platform}`;

    let authUrl: string;

    switch (platform) {
      case "facebook":
      case "instagram":
        authUrl = await facebook.getOAuthUrl({ brand_id, redirect_uri, state });
        break;
      case "linkedin":
        authUrl = linkedin.getOAuthUrl({ redirect_uri, state });
        break;
      case "youtube":
        authUrl = youtube.getOAuthUrl({ redirect_uri, state });
        break;
      default:
        return errorResponse("Platform not supported", 400);
    }

    return successResponse({ auth_url: authUrl });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}

// POST /api/social/connect/[platform] - Disconnect account
export async function DELETE(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const { userId } = await getAuthContext();
    const body = await request.json();
    const { account_id } = body;

    if (!account_id) return errorResponse("account_id is required", 422);

    const supabase = await createClient();

    const { data: account } = await supabase
      .from("social_accounts")
      .select("id, brand_id, platform_account_name")
      .eq("id", account_id)
      .eq("user_id", userId)
      .single();

    if (!account) return errorResponse("Account not found", 404);

    await supabase
      .from("social_accounts")
      .update({ status: "revoked" })
      .eq("id", account_id);

    await writeAuditLog({
      user_id: userId,
      brand_id: account.brand_id,
      action: "social.disconnect",
      entity_type: "social_account",
      entity_id: account_id,
      details: { platform: params.platform, name: account.platform_account_name },
    });

    return successResponse({ disconnected: true });
  } catch (error: unknown) {
    if ((error as Error).name === "AuthError") return unauthorizedResponse();
    return errorResponse((error as Error).message, 500);
  }
}
