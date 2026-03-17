import axios from "axios";
import type { ContentItem, SocialAccount, PublishResult } from "@/types";
import { platformLimiters } from "@/lib/security/rate-limit";
import { log } from "@/lib/audit/logger";

const FB_API_BASE = "https://graph.facebook.com/v21.0";

export interface InstagramAccount {
  id: string;
  name: string;
  username: string;
  profile_picture_url?: string;
  ig_id: string;
}

/**
 * Get Instagram Business account linked to a Facebook Page
 */
export async function getInstagramAccount(
  page_id: string,
  page_token: string
): Promise<InstagramAccount | null> {
  try {
    const response = await axios.get(`${FB_API_BASE}/${page_id}`, {
      params: {
        access_token: page_token,
        fields: "instagram_business_account{id,name,username,profile_picture_url}",
      },
    });

    const ig = response.data?.instagram_business_account;
    if (!ig) return null;

    return {
      id: ig.id,
      ig_id: ig.id,
      name: ig.name,
      username: ig.username,
      profile_picture_url: ig.profile_picture_url,
    };
  } catch {
    return null;
  }
}

/**
 * Publish an Instagram post (single image, carousel, or reel)
 */
export async function publishPost(
  account: SocialAccount,
  access_token: string,
  content: ContentItem,
  mediaUrls: string[]
): Promise<PublishResult> {
  const limitCheck = platformLimiters.instagram(account.id);
  if (!limitCheck.success) {
    return {
      success: false,
      error: "Instagram rate limit reached",
      error_code: "RATE_LIMITED",
    };
  }

  const igAccountId = account.platform_account_id;
  const caption = content.platform_overrides?.instagram?.caption || content.caption || "";
  const hashtags = content.hashtags.map((h) => `#${h}`).join(" ");
  const fullCaption = hashtags ? `${caption}\n\n${hashtags}` : caption;

  try {
    if (mediaUrls.length === 0) {
      return { success: false, error: "Instagram requires at least one image" };
    }

    let mediaContainerId: string;

    if (mediaUrls.length === 1) {
      const isVideo = mediaUrls[0].match(/\.(mp4|mov)$/i);
      const isReel = isVideo && (content.platform_overrides?.instagram as { is_reel?: boolean })?.is_reel;

      if (isReel) {
        // Reel
        const createRes = await axios.post(
          `${FB_API_BASE}/${igAccountId}/media`,
          {
            media_type: "REELS",
            video_url: mediaUrls[0],
            caption: fullCaption,
            access_token,
          }
        );
        mediaContainerId = createRes.data.id;

        // Wait for video processing
        await waitForMediaReady(igAccountId, mediaContainerId, access_token);
      } else if (isVideo) {
        // Video
        const createRes = await axios.post(
          `${FB_API_BASE}/${igAccountId}/media`,
          {
            media_type: "VIDEO",
            video_url: mediaUrls[0],
            caption: fullCaption,
            access_token,
          }
        );
        mediaContainerId = createRes.data.id;
        await waitForMediaReady(igAccountId, mediaContainerId, access_token);
      } else {
        // Single image
        const createRes = await axios.post(
          `${FB_API_BASE}/${igAccountId}/media`,
          {
            image_url: mediaUrls[0],
            caption: fullCaption,
            access_token,
          }
        );
        mediaContainerId = createRes.data.id;
      }
    } else {
      // Carousel (2-10 images)
      const childIds = await Promise.all(
        mediaUrls.slice(0, 10).map(async (url) => {
          const isVideo = url.match(/\.(mp4|mov)$/i);
          const res = await axios.post(`${FB_API_BASE}/${igAccountId}/media`, {
            ...(isVideo
              ? { media_type: "VIDEO", video_url: url }
              : { image_url: url }),
            is_carousel_item: true,
            access_token,
          });
          return res.data.id;
        })
      );

      const carouselRes = await axios.post(
        `${FB_API_BASE}/${igAccountId}/media`,
        {
          media_type: "CAROUSEL",
          children: childIds.join(","),
          caption: fullCaption,
          access_token,
        }
      );
      mediaContainerId = carouselRes.data.id;
    }

    // Publish the container
    const publishRes = await axios.post(
      `${FB_API_BASE}/${igAccountId}/media_publish`,
      {
        creation_id: mediaContainerId,
        access_token,
      }
    );

    const postId = publishRes.data.id;

    return {
      success: true,
      platform_post_id: postId,
      platform_post_url: `https://www.instagram.com/p/${postId}/`,
    };
  } catch (error: unknown) {
    const igError = (error as { response?: { data?: { error?: { message?: string; code?: number } } } })?.response?.data?.error;
    log("error", "Instagram publish failed", {
      account_id: account.id,
      error: igError?.message,
      code: igError?.code,
    });

    return {
      success: false,
      error: igError?.message || "Instagram publish failed",
      error_code: igError?.code?.toString(),
    };
  }
}

/**
 * Poll until media container is ready for publishing
 */
async function waitForMediaReady(
  igAccountId: string,
  mediaId: string,
  access_token: string,
  maxAttempts = 10
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const res = await axios.get(`${FB_API_BASE}/${mediaId}`, {
      params: { access_token, fields: "status_code" },
    });

    const status = res.data.status_code;
    if (status === "FINISHED") return;
    if (status === "ERROR") throw new Error("Media processing failed");
  }
  throw new Error("Media processing timed out");
}
