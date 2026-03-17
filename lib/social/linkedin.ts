import axios from "axios";
import type { ContentItem, SocialAccount, PublishResult } from "@/types";
import { platformLimiters } from "@/lib/security/rate-limit";
import { log } from "@/lib/audit/logger";

const LI_API_BASE = "https://api.linkedin.com/v2";
const LI_REST_BASE = "https://api.linkedin.com/rest";

export interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  profilePicture?: { displayImage: string };
}

export interface LinkedInOrg {
  id: string;
  name: { localized: { [key: string]: string } };
  logoV2?: { original: string };
}

export function getOAuthUrl(params: {
  redirect_uri: string;
  state: string;
}): string {
  const scopes = [
    "r_liteprofile",
    "r_emailaddress",
    "w_member_social",
    "r_organization_social",
    "w_organization_social",
    "rw_organization_admin",
  ].join(" ");

  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID!);
  url.searchParams.set("redirect_uri", params.redirect_uri);
  url.searchParams.set("scope", scopes);
  url.searchParams.set("state", params.state);

  return url.toString();
}

export async function exchangeCodeForToken(
  code: string,
  redirect_uri: string
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const response = await axios.post(
    "https://www.linkedin.com/oauth/v2/accessToken",
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return response.data;
}

export async function refreshToken(
  refresh_token: string
): Promise<{ access_token: string; expires_in: number }> {
  const response = await axios.post(
    "https://www.linkedin.com/oauth/v2/accessToken",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return response.data;
}

export async function getProfile(access_token: string): Promise<LinkedInProfile> {
  const response = await axios.get(`${LI_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${access_token}` },
    params: { projection: "(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))" },
  });
  return response.data;
}

export async function getUserOrgs(access_token: string): Promise<LinkedInOrg[]> {
  const response = await axios.get(`${LI_API_BASE}/organizationAcls`, {
    headers: { Authorization: `Bearer ${access_token}` },
    params: { q: "roleAssignee", role: "ADMINISTRATOR", state: "APPROVED" },
  });

  const elements = response.data.elements || [];
  const orgs = await Promise.all(
    elements.slice(0, 10).map(async (el: { organization: string }) => {
      const orgId = el.organization.split(":").pop();
      try {
        const orgRes = await axios.get(`${LI_API_BASE}/organizations/${orgId}`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        return orgRes.data;
      } catch {
        return null;
      }
    })
  );

  return orgs.filter(Boolean);
}

/**
 * Publish a post to LinkedIn (profile or company page)
 */
export async function publishPost(
  account: SocialAccount,
  access_token: string,
  content: ContentItem,
  mediaUrls: string[]
): Promise<PublishResult> {
  const limitCheck = platformLimiters.linkedin(account.id);
  if (!limitCheck.success) {
    return {
      success: false,
      error: "LinkedIn rate limit reached",
      error_code: "RATE_LIMITED",
    };
  }

  try {
    const isCompany = account.account_type === "company";
    const authorUrn = isCompany
      ? `urn:li:organization:${account.platform_account_id}`
      : `urn:li:person:${account.platform_account_id}`;

    const override = content.platform_overrides?.linkedin;
    const caption = override?.caption || content.caption || "";
    const hashtags = content.hashtags.map((h) => `#${h}`).join(" ");
    const text = hashtags ? `${caption}\n\n${hashtags}` : caption;

    let shareContent: Record<string, unknown>;

    if (mediaUrls.length > 0) {
      // Register + upload image
      const assetUrn = await uploadLinkedInImage(mediaUrls[0], access_token, authorUrn);

      shareContent = {
        contentEntities: [
          {
            entity: assetUrn,
          },
        ],
        title: override?.article_title || content.title || undefined,
        description: text,
        shareMediaCategory: "IMAGE",
      };
    } else if (override?.article_url) {
      shareContent = {
        contentEntities: [
          {
            entityLocation: override.article_url,
            thumbnails: [],
          },
        ],
        title: override.article_title || content.title || text.substring(0, 100),
        description: override.article_description || text,
        shareMediaCategory: "ARTICLE",
      };
    } else {
      shareContent = { shareMediaCategory: "NONE" };
    }

    const payload = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text },
          shareMediaCategory: shareContent.shareMediaCategory,
          ...(shareContent.shareMediaCategory !== "NONE" && {
            media: [
              {
                status: "READY",
                ...(shareContent.contentEntities
                  ? { originalUrl: (shareContent.contentEntities as Array<{ entityLocation?: string; entity?: string }>)[0].entityLocation }
                  : {}),
                ...(shareContent.contentEntities && (shareContent.contentEntities as Array<{ entity?: string }>)[0].entity
                  ? { media: (shareContent.contentEntities as Array<{ entity?: string }>)[0].entity }
                  : {}),
                title: { text: (shareContent.title as string) || "" },
                description: { text: (shareContent.description as string) || "" },
              },
            ],
          }),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const response = await axios.post(`${LI_API_BASE}/ugcPosts`, payload, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    const postId = response.headers["x-restli-id"] || response.data.id;

    return {
      success: true,
      platform_post_id: postId,
      platform_post_url: `https://www.linkedin.com/feed/update/${postId}`,
    };
  } catch (error: unknown) {
    const liError = (error as { response?: { data?: unknown; status?: number } })?.response;
    log("error", "LinkedIn publish failed", {
      account_id: account.id,
      status: liError?.status,
      error: JSON.stringify(liError?.data),
    });

    return {
      success: false,
      error: "LinkedIn publish failed",
      error_code: liError?.status?.toString(),
    };
  }
}

async function uploadLinkedInImage(
  imageUrl: string,
  access_token: string,
  owner: string
): Promise<string> {
  // Register upload
  const registerRes = await axios.post(
    `${LI_API_BASE}/assets?action=registerUpload`,
    {
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const uploadUrl = registerRes.data.value.uploadMechanism[
    "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
  ].uploadUrl;
  const asset = registerRes.data.value.asset;

  // Download image and upload to LinkedIn
  const imageRes = await axios.get(imageUrl, { responseType: "arraybuffer" });
  await axios.put(uploadUrl, imageRes.data, {
    headers: {
      Authorization: `Bearer ${access_token}`,
      "Content-Type": "application/octet-stream",
    },
  });

  return asset;
}
