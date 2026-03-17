import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/security/encryption";
import * as facebook from "@/lib/social/facebook";
import * as instagram from "@/lib/social/instagram";
import * as linkedin from "@/lib/social/linkedin";
import * as youtube from "@/lib/social/youtube";
import { writeAuditLog, log } from "@/lib/audit/logger";
import { jwtVerify } from "jose";
import type { OAuthState, Platform } from "@/types";

const JWT_SECRET = new TextEncoder().encode(process.env.APP_SECRET_KEY!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const platform = params.platform as Platform;

  if (error) {
    return NextResponse.redirect(`${APP_URL}/dashboard/settings?error=oauth_denied&platform=${platform}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/dashboard/settings?error=invalid_callback`);
  }

  try {
    // Verify state JWT
    const { payload } = await jwtVerify(state, JWT_SECRET);
    const stateData = payload as unknown as OAuthState;

    if (stateData.platform !== platform) {
      throw new Error("Platform mismatch in state");
    }

    const redirect_uri = `${APP_URL}/api/social/callback/${platform}`;
    const supabase = createServiceRoleClient();

    if (platform === "facebook" || platform === "instagram") {
      // Exchange code for token
      const tokenData = await facebook.exchangeCodeForToken(code, redirect_uri);
      const longLivedToken = await facebook.getLongLivedToken(tokenData.access_token);

      // Get pages
      const pages = await facebook.getUserPages(longLivedToken.access_token);

      if (pages.length === 0) {
        return NextResponse.redirect(
          `${APP_URL}/dashboard/settings?error=no_pages&platform=${platform}`
        );
      }

      // Connect all pages (user can choose later which to use)
      for (const page of pages) {
        const pageToken = await facebook.getPageToken(page.id, longLivedToken.access_token);

        // Store Facebook page
        if (platform === "facebook") {
          await upsertSocialAccount(supabase, {
            brand_id: stateData.brand_id,
            user_id: stateData.user_id,
            platform: "facebook",
            account_type: "page",
            platform_account_id: page.id,
            platform_account_name: page.name,
            access_token: pageToken,
            token_scopes: ["pages_manage_posts", "pages_read_engagement"],
          });
        }

        // Check for linked Instagram Business account
        const igAccount = await instagram.getInstagramAccount(page.id, pageToken);
        if (igAccount && platform === "instagram") {
          await upsertSocialAccount(supabase, {
            brand_id: stateData.brand_id,
            user_id: stateData.user_id,
            platform: "instagram",
            account_type: "page",
            platform_account_id: igAccount.id,
            platform_account_name: igAccount.name,
            platform_username: igAccount.username,
            avatar_url: igAccount.profile_picture_url,
            access_token: pageToken, // Instagram uses page token
            token_scopes: ["instagram_basic", "instagram_content_publish"],
          });
        }
      }

      await writeAuditLog({
        user_id: stateData.user_id,
        brand_id: stateData.brand_id,
        action: "social.connect",
        entity_type: "social_account",
        details: { platform, pages_count: pages.length },
      });

      return NextResponse.redirect(
        `${APP_URL}/dashboard/brands/${stateData.brand_id}?connected=${platform}&count=${pages.length}`
      );
    }

    if (platform === "linkedin") {
      const tokenData = await linkedin.exchangeCodeForToken(code, redirect_uri);
      const profile = await linkedin.getProfile(tokenData.access_token);

      await upsertSocialAccount(supabase, {
        brand_id: stateData.brand_id,
        user_id: stateData.user_id,
        platform: "linkedin",
        account_type: "profile",
        platform_account_id: profile.id,
        platform_account_name: `${profile.localizedFirstName} ${profile.localizedLastName}`,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_scopes: ["w_member_social"],
      });

      // Also connect company pages
      try {
        const orgs = await linkedin.getUserOrgs(tokenData.access_token);
        for (const org of orgs) {
          const orgName = Object.values(org.name?.localized || {})[0] as string || "Unknown";
          await upsertSocialAccount(supabase, {
            brand_id: stateData.brand_id,
            user_id: stateData.user_id,
            platform: "linkedin",
            account_type: "company",
            platform_account_id: org.id,
            platform_account_name: orgName,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_in: tokenData.expires_in,
            token_scopes: ["w_organization_social"],
          });
        }
      } catch {
        // Company pages are optional
      }

      return NextResponse.redirect(
        `${APP_URL}/dashboard/brands/${stateData.brand_id}?connected=linkedin`
      );
    }

    if (platform === "youtube") {
      const tokenData = await youtube.exchangeCodeForToken(code, redirect_uri);
      const channel = await youtube.getChannel(tokenData.access_token);

      if (!channel) {
        return NextResponse.redirect(
          `${APP_URL}/dashboard/settings?error=no_channel&platform=youtube`
        );
      }

      await upsertSocialAccount(supabase, {
        brand_id: stateData.brand_id,
        user_id: stateData.user_id,
        platform: "youtube",
        account_type: "channel",
        platform_account_id: channel.id,
        platform_account_name: channel.snippet?.title || "YouTube Channel",
        platform_username: channel.snippet?.customUrl,
        avatar_url: channel.snippet?.thumbnails?.default?.url,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_scopes: ["youtube.upload"],
      });

      return NextResponse.redirect(
        `${APP_URL}/dashboard/brands/${stateData.brand_id}?connected=youtube`
      );
    }

    return NextResponse.redirect(`${APP_URL}/dashboard/settings?error=unsupported_platform`);
  } catch (error: unknown) {
    log("error", "OAuth callback failed", {
      platform,
      error: (error as Error).message,
    });
    return NextResponse.redirect(
      `${APP_URL}/dashboard/settings?error=oauth_failed&message=${encodeURIComponent((error as Error).message)}`
    );
  }
}

interface UpsertAccountParams {
  brand_id: string;
  user_id: string;
  platform: Platform;
  account_type: string;
  platform_account_id: string;
  platform_account_name: string;
  platform_username?: string;
  avatar_url?: string;
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_scopes: string[];
}

async function upsertSocialAccount(
  supabase: ReturnType<typeof createServiceRoleClient>,
  params: UpsertAccountParams
) {
  const expiresAt = params.expires_in
    ? new Date(Date.now() + params.expires_in * 1000).toISOString()
    : null;

  await supabase.from("social_accounts").upsert(
    {
      brand_id: params.brand_id,
      user_id: params.user_id,
      platform: params.platform,
      account_type: params.account_type,
      platform_account_id: params.platform_account_id,
      platform_account_name: params.platform_account_name,
      platform_username: params.platform_username || null,
      avatar_url: params.avatar_url || null,
      access_token_encrypted: encryptToken(params.access_token),
      refresh_token_encrypted: params.refresh_token ? encryptToken(params.refresh_token) : null,
      token_expires_at: expiresAt,
      token_scopes: params.token_scopes,
      status: "active",
      error_count: 0,
      connected_at: new Date().toISOString(),
    },
    {
      onConflict: "brand_id,platform,platform_account_id",
    }
  );
}
