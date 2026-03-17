import { z } from "zod";
import he from "he";

/**
 * Sanitize HTML entities in a string
 */
export function sanitizeText(input: string): string {
  return he.encode(input, { useNamedReferences: true, allowUnsafeSymbols: false });
}

/**
 * Strip HTML tags completely
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Validate and sanitize a URL
 */
export function validateUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Validate social content against banned words
 */
export function checkBannedWords(content: string, bannedWords: string[]): string[] {
  const lower = content.toLowerCase();
  return bannedWords.filter((word) => lower.includes(word.toLowerCase()));
}

/**
 * Check for duplicate content within a time window
 */
export function isDuplicateContent(newContent: string, recentContents: string[]): boolean {
  const normalized = normalizeContent(newContent);
  return recentContents.some((recent) => {
    const normalizedRecent = normalizeContent(recent);
    return similarity(normalized, normalizedRecent) > 0.85;
  });
}

function normalizeContent(text: string): string {
  return text
    .toLowerCase()
    .replace(/[#@\s]+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const maxLen = Math.max(a.length, b.length);
  return 1 - matrix[b.length][a.length] / maxLen;
}

// ============================================================
// ZOD SCHEMAS for input validation
// ============================================================

export const createBrandSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  slug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only")
    .trim(),
  description: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().max(100).optional(),
  tone: z.enum(["professional", "casual", "friendly", "authoritative", "humorous", "inspirational"]),
  voice_description: z.string().max(500).optional(),
  default_hashtags: z.array(z.string().max(50)).max(30).optional(),
  banned_words: z.array(z.string().max(50)).max(100).optional(),
  cta_style: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const createContentSchema = z.object({
  brand_id: z.string().uuid(),
  target_platforms: z.array(z.enum(["facebook", "instagram", "linkedin", "youtube"])).min(1),
  target_account_ids: z.array(z.string().uuid()).min(1),
  title: z.string().max(300).optional(),
  caption: z.string().max(10000).optional(),
  hashtags: z.array(z.string().max(100)).max(50).optional(),
  first_comment: z.string().max(2200).optional(),
  platform_overrides: z.record(z.unknown()).optional(),
  media_asset_ids: z.array(z.string().uuid()).max(10).optional(),
  link_url: z.string().url().optional().or(z.literal("")),
  scheduled_at: z.string().datetime().optional(),
  timezone: z.string().max(50).optional(),
  is_recurring: z.boolean().optional(),
  recurrence_rule: z.record(z.unknown()).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(1000).optional(),
});

export const generateCaptionSchema = z.object({
  brand_id: z.string().uuid(),
  topic: z.string().min(1).max(500).trim(),
  platform: z.enum(["facebook", "instagram", "linkedin", "youtube"]),
  tone: z.enum(["professional", "casual", "friendly", "authoritative", "humorous", "inspirational"]).optional(),
  keywords: z.array(z.string().max(50)).max(10).optional(),
  target_audience: z.string().max(200).optional(),
  include_cta: z.boolean().optional(),
});

export const generateReplySchema = z.object({
  brand_id: z.string().uuid(),
  message_id: z.string().uuid(),
  tone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
});

export const uploadMediaSchema = z.object({
  brand_id: z.string().uuid(),
  filename: z.string().min(1).max(255),
  mime_type: z.string().max(100),
  file_size_bytes: z.number().int().positive().max(512 * 1024 * 1024), // 512MB max
  alt_text: z.string().max(300).optional(),
  folder: z.string().max(100).optional(),
});

export const replyToMessageSchema = z.object({
  message_id: z.string().uuid(),
  content: z.string().min(1).max(2200).trim(),
  was_ai_suggested: z.boolean().optional(),
});
