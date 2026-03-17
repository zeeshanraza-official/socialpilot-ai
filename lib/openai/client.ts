import OpenAI from "openai";
import type { Brand, Platform, InboxMessage, BrandTone } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// ============================================================
// CAPTION GENERATION
// ============================================================
export async function generateCaption(params: {
  brand: Brand;
  topic: string;
  platform: Platform;
  keywords?: string[];
  target_audience?: string;
  include_cta?: boolean;
}): Promise<{ caption: string; hashtags: string[]; first_comment: string }> {
  const platformGuidelines = getPlatformGuidelines(params.platform);

  const systemPrompt = `You are a social media content expert for ${params.brand.name}.

Brand tone: ${params.brand.tone}
${params.brand.voice_description ? `Voice: ${params.brand.voice_description}` : ""}
${params.brand.cta_style ? `CTA style: ${params.brand.cta_style}` : ""}
${params.brand.banned_words.length > 0 ? `NEVER use these words: ${params.brand.banned_words.join(", ")}` : ""}

Platform: ${params.platform}
${platformGuidelines}

You MUST return a valid JSON object with exactly these fields:
{
  "caption": "the post caption",
  "hashtags": ["hashtag1", "hashtag2"],
  "first_comment": "engagement first comment"
}`;

  const userPrompt = `Create a ${params.brand.tone} ${params.platform} post about: ${params.topic}
${params.keywords ? `Keywords to include: ${params.keywords.join(", ")}` : ""}
${params.target_audience ? `Target audience: ${params.target_audience}` : ""}
${params.include_cta ? "Include a strong call-to-action." : ""}
${params.brand.default_hashtags.length > 0 ? `Always include these brand hashtags: ${params.brand.default_hashtags.join(" ")}` : ""}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 1000,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");

  return {
    caption: result.caption || "",
    hashtags: Array.isArray(result.hashtags) ? result.hashtags : [],
    first_comment: result.first_comment || "",
  };
}

// ============================================================
// CONTENT VARIATIONS
// ============================================================
export async function generateVariations(params: {
  brand: Brand;
  original_caption: string;
  platform: Platform;
  count?: number;
}): Promise<string[]> {
  const count = params.count || 3;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a content writer for ${params.brand.name}.
Brand tone: ${params.brand.tone}.
Generate ${count} unique variations of the provided caption for ${params.platform}.
Each variation must be meaningfully different while keeping the same core message.
Return JSON: { "variations": ["variation1", "variation2", ...] }`,
      },
      {
        role: "user",
        content: `Original caption:\n${params.original_caption}\n\nGenerate ${count} variations:`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
    max_tokens: 1500,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return Array.isArray(result.variations) ? result.variations : [];
}

// ============================================================
// HASHTAG SUGGESTIONS
// ============================================================
export async function generateHashtags(params: {
  brand: Brand;
  caption: string;
  platform: Platform;
  count?: number;
}): Promise<string[]> {
  const count = params.count || 20;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a hashtag expert for ${params.platform}.
Generate relevant, trending hashtags for the content.
Mix: broad reach hashtags, niche hashtags, and brand-specific hashtags.
Return JSON: { "hashtags": ["hashtag1", "hashtag2", ...] }
Do NOT include # symbol in the hashtags array.`,
      },
      {
        role: "user",
        content: `Generate ${count} hashtags for this ${params.platform} post:\n${params.caption}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.6,
    max_tokens: 500,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return Array.isArray(result.hashtags) ? result.hashtags.slice(0, count) : [];
}

// ============================================================
// REPLY SUGGESTIONS
// ============================================================
export async function generateReplySuggestions(params: {
  brand: Brand;
  message: InboxMessage;
  count?: number;
}): Promise<Array<{ text: string; tone: string; confidence: number }>> {
  const count = params.count || 3;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a community manager for ${params.brand.name}.
Brand tone: ${params.brand.tone}.
${params.brand.voice_description ? `Voice: ${params.brand.voice_description}` : ""}
${params.brand.banned_words.length > 0 ? `NEVER use: ${params.brand.banned_words.join(", ")}` : ""}

Generate ${count} reply suggestions for this ${params.message.platform} ${params.message.message_type}.
Each reply should be authentic, brand-consistent, and helpful.
Return JSON: { "replies": [{ "text": "reply text", "tone": "tone description", "confidence": 0.9 }] }`,
      },
      {
        role: "user",
        content: `${params.message.sender_name} said: "${params.message.content}"
Message type: ${params.message.message_type}
Detected sentiment: ${params.message.sentiment}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 800,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return Array.isArray(result.replies) ? result.replies : [];
}

// ============================================================
// YOUTUBE SEO
// ============================================================
export async function generateYouTubeSeo(params: {
  brand: Brand;
  video_description: string;
}): Promise<{ title: string; description: string; tags: string[] }> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a YouTube SEO expert for ${params.brand.name}.
Generate SEO-optimized title, description, and tags for a YouTube video.
Rules:
- Title: 60-70 characters, include main keyword naturally
- Description: 150-300 characters for above-the-fold, compelling
- Tags: 10-15 specific and broad tags
Return JSON: { "title": "...", "description": "...", "tags": [...] }`,
      },
      {
        role: "user",
        content: `Video about: ${params.video_description}`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.6,
    max_tokens: 800,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return {
    title: result.title || "",
    description: result.description || "",
    tags: Array.isArray(result.tags) ? result.tags : [],
  };
}

// ============================================================
// AI IMAGE GENERATION (DALL-E)
// ============================================================
export async function generateImage(params: {
  brand: Brand;
  prompt: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
}): Promise<{ url: string; revised_prompt: string }> {
  const brandContext = `Brand: ${params.brand.name}. Tone: ${params.brand.tone}.`;
  const enhancedPrompt = `${brandContext} ${params.prompt}. Professional quality, social media optimized.`;

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: enhancedPrompt,
    n: 1,
    size: params.size || "1024x1024",
    quality: "standard",
    response_format: "url",
  });

  return {
    url: response.data[0].url!,
    revised_prompt: response.data[0].revised_prompt || params.prompt,
  };
}

// ============================================================
// SENTIMENT ANALYSIS
// ============================================================
export async function analyzeSentiment(
  text: string
): Promise<"positive" | "neutral" | "negative"> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: 'Analyze sentiment. Return JSON: { "sentiment": "positive" | "neutral" | "negative" }',
      },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 50,
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  return result.sentiment || "neutral";
}

// ============================================================
// HELPERS
// ============================================================
function getPlatformGuidelines(platform: Platform): string {
  const guidelines: Record<Platform, string> = {
    facebook: "Facebook best practices: 40-80 words optimal. Use stories, ask questions, encourage comments.",
    instagram: "Instagram best practices: 138-150 chars for the preview. Emojis welcome. 3-5 key hashtags inline, more in first comment.",
    linkedin: "LinkedIn best practices: Professional tone. 1300 char optimal. Thought leadership. No excessive hashtags (max 3-5).",
    youtube: "YouTube: Engaging, descriptive. Include keywords naturally. Call to subscribe.",
  };
  return guidelines[platform];
}
