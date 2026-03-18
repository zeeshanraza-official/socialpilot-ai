import axios from "axios";
import type { ContentItem, SocialAccount, PublishResult } from "@/types";
import { platformLimiters } from "@/lib/security/rate-limit";
import { log } from "@/lib/audit/logger";

const FB_API_BASE = "https://graph.facebook.com/v21.0";

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  picture?: { data: { url: string } };
}

/**
 * Exchange user token for long-lived token and get pages
 */
export async function getOAuthUrl(params: {
  brand_id: string;
  redirect_uri: string;
  state: string;
}): Promise<string> {
  const scopes = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "instagram_content_publish",
    "instagram_manage_comments",
    "instagram_manage_insights",
  ].join(",");

  const url = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  url.searchParams.set("client_id", process.env.META_APP_ID!);
  url.searchParams.set("redirect_uri", params.redirect_uri);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", params.state);
  url.searchParams.set("response_type", "code");

  return url.toString();
}

/**
 * Exchange code for token
 */
export async function exchangeCodeForToken(
  code: string,
  redirect_uri: string
): Promise<{ access_token: string; expires_in?: number }> {
  const response = await axios.get(`${FB_API_BASE}/oauth/access_token`, {
    params: {
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      redirect_uri,
      code,
    },
  });
  return response.data;
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function getLongLivedToken(
  short_lived_token: string
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  const response = await axios.get(`${FB_API_BASE}/oauth/access_token`, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: process.env.META_APP_ID,
      client_secret: process.env.META_APP_SECRET,
      fb_exchange_token: short_lived_token,
    },
  });
  return response.data;
}

/**
 * Get pages the user manages
 */
export async function getUserPages(user_access_token: string): Promise<FacebookPage[]> {
  const response = await axios.get(`${FB_API_BASE}/me/accounts`, {
    params: {
      access_token: user_access_token,
      fields: "id,name,access_token,category,picture",
    },
  });
  return response.data.data || [];
}

/**
 * Get a page's never-expiring token
 */
export async function getPageToken(
  page_id: string,
  user_access_token: string
): Promise<string> {
  const response = await axios.get(`${FB_API_BASE}/${page_id}`, {
    params: {
      access_token: user_access_token,
      fields: "access_token",
    },
  });
  return response.data.access_token;
}

/**
 * Publish a post to a Facebook Page
 */
export async function publishPost(
  account: SocialAccount,
  access_token: string,
  content: ContentItem,
  mediaUrls: string[]
): Promise<PublishResult> {
  const limitCheck = platformLimiters.facebook(account.id);
  if (!limitCheck.success) {
    return {
      success: false,
      error: "Facebook rate limit reached",
      error_code: "RATE_LIMITED",
    };
  }

  try {
    const pageId = account.platform_account_id;
    const caption = content.platform_overrides?.facebook?.caption || content.caption || "";
    const hashtags = content.hashtags.map((h) => `#${h}`).join(" ");
    const message = hashtags ? `${caption}\n\n${hashtags}` : caption;

    let endpoint: string;
    let payload: Record<string, unknown>;

    if (mediaUrls.length === 0) {
      // Text-only post
      endpoint = `${FB_API_BASE}/${pageId}/feed`;
      payload = {
        message,
        access_token,
        link: content.link_url || undefined,
      };
    } else if (mediaUrls.length === 1) {
      const isVideo = mediaUrls[0].match(/\.(mp4|mov|avi|wmv)$/i);
      if (isVideo) {
        endpoint = `${FB_API_BASE}/${pageId}/videos`;
        payload = {
          description: message,
          file_url: mediaUrls[0],
          access_token,
        };
      } else {
        endpoint = `${FB_API_BASE}/${pageId}/photos`;
        payload = {
          caption: message,
          url: mediaUrls[0],
          published: true,
          access_token,
        };
      }
    } else {
      // Multi-image post
      const photoIds = await Promise.all(
        mediaUrls.map(async (url) => {
          const res = await axios.post(`${FB_API_BASE}/${pageId}/photos`, {
            url,
            published: false,
            access_token,
          });
          return { media_fbid: res.data.id };
        })
      );

      endpoint = `${FB_API_BASE}/${pageId}/feed`;
      payload = {
        message,
        attached_media: photoIds,
        access_token,
      };
    }

    const response = await axios.post(endpoint, payload);
    const postId = response.data.id || response.data.post_id;

    return {
      success: true,
      platform_post_id: postId,
      platform_post_url: `https://www.facebook.com/${postId}`,
    };
  } catch (error: unknown) {
    const fbError = (error as { response?: { data?: { error?: { message?: string; code?: number } } } })?.response?.data?.error;
    log("error", "Facebook publish failed", {
      account_id: account.id,
      error: fbError?.message,
      code: fbError?.code,
    });

    return {
      success: false,
      error: fbError?.message || "Facebook publish failed",
      error_code: fbError?.code?.toString(),
    };
  }
}

/**
 * Refresh page token before expiry
 */
export async function refreshPageToken(
  page_id: string,
  current_token: string
): Promise<string | null> {
  try {
    // Page tokens don't expire but we verify they're still valid
    const response = await axios.get(`${FB_API_BASE}/${page_id}`, {
      params: {
        access_token: current_token,
        fields: "id,name",
      },
    });
    return current_token; // Still valid
  } catch {
    return null;
  }
}
