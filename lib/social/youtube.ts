import axios from "axios";
import type { ContentItem, SocialAccount, PublishResult } from "@/types";
import { platformLimiters } from "@/lib/security/rate-limit";
import { log } from "@/lib/audit/logger";

const YT_API_BASE = "https://www.googleapis.com/youtube/v3";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export function getOAuthUrl(params: {
  redirect_uri: string;
  state: string;
}): string {
  const scopes = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
  ].join(" ");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", params.redirect_uri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", params.state);

  return url.toString();
}

export async function exchangeCodeForToken(
  code: string,
  redirect_uri: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  const response = await axios.post(
    GOOGLE_TOKEN_URL,
    new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri,
      grant_type: "authorization_code",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return response.data;
}

export async function refreshAccessToken(
  refresh_token: string
): Promise<{ access_token: string; expires_in: number }> {
  const response = await axios.post(
    GOOGLE_TOKEN_URL,
    new URLSearchParams({
      refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return response.data;
}

export async function getChannel(access_token: string) {
  const response = await axios.get(`${YT_API_BASE}/channels`, {
    headers: { Authorization: `Bearer ${access_token}` },
    params: {
      part: "id,snippet,statistics",
      mine: true,
    },
  });

  return response.data.items?.[0] || null;
}

/**
 * Upload a video to YouTube
 */
export async function publishVideo(
  account: SocialAccount,
  access_token: string,
  content: ContentItem,
  videoUrl: string
): Promise<PublishResult> {
  const limitCheck = platformLimiters.youtube(account.id);
  if (!limitCheck.success) {
    return {
      success: false,
      error: "YouTube rate limit reached",
      error_code: "RATE_LIMITED",
    };
  }

  try {
    const ytOverride = content.platform_overrides?.youtube;
    const title = ytOverride?.title || content.title || "Untitled Video";
    const description = ytOverride?.description || content.caption || "";
    const tags = ytOverride?.tags || content.hashtags || [];
    const privacyStatus = ytOverride?.privacy_status || "public";
    const categoryId = ytOverride?.category_id || "22"; // People & Blogs

    // Download video and re-upload to YouTube
    const videoResponse = await axios.get(videoUrl, { responseType: "stream" });
    const contentType = videoResponse.headers["content-type"] || "video/mp4";

    // Initiate resumable upload
    const initResponse = await axios.post(
      `${YT_API_BASE}/videos?uploadType=resumable&part=snippet,status`,
      {
        snippet: {
          title: title.substring(0, 100),
          description,
          tags: tags.slice(0, 500),
          categoryId,
          defaultLanguage: "en",
        },
        status: {
          privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": contentType,
        },
      }
    );

    const uploadUrl = initResponse.headers.location;

    // Upload video data
    const uploadResponse = await axios.put(uploadUrl, videoResponse.data, {
      headers: {
        "Content-Type": contentType,
        Authorization: `Bearer ${access_token}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const videoId = uploadResponse.data.id;

    return {
      success: true,
      platform_post_id: videoId,
      platform_post_url: `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch (error: unknown) {
    const ytError = (error as { response?: { data?: { error?: { message?: string; code?: number } } } })?.response?.data?.error;
    log("error", "YouTube upload failed", {
      account_id: account.id,
      error: ytError?.message,
      code: ytError?.code,
    });

    return {
      success: false,
      error: ytError?.message || "YouTube upload failed",
      error_code: ytError?.code?.toString(),
    };
  }
}

/**
 * Create a YouTube Community Post (text/image post)
 */
export async function publishCommunityPost(
  account: SocialAccount,
  access_token: string,
  content: ContentItem
): Promise<PublishResult> {
  const limitCheck = platformLimiters.youtube(account.id);
  if (!limitCheck.success) {
    return { success: false, error: "YouTube rate limit reached", error_code: "RATE_LIMITED" };
  }

  try {
    const caption = content.caption || "";
    const hashtags = content.hashtags.map((h) => `#${h}`).join(" ");
    const text = hashtags ? `${caption}\n\n${hashtags}` : caption;

    const response = await axios.post(
      `${YT_API_BASE}/posts?part=id,snippet`,
      {
        snippet: { textOriginal: text },
      },
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const postId = response.data.id;

    return {
      success: true,
      platform_post_id: postId,
      platform_post_url: `https://www.youtube.com/post/${postId}`,
    };
  } catch (error: unknown) {
    const ytError = (error as { response?: { data?: { error?: { message?: string; code?: number } } } })?.response?.data?.error;
    return {
      success: false,
      error: ytError?.message || "YouTube community post failed",
      error_code: ytError?.code?.toString(),
    };
  }
}
