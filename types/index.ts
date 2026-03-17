// ============================================================
// SOCIALPILOT AI - Core Types
// ============================================================

export type Platform = "facebook" | "instagram" | "linkedin" | "youtube";
export type AccountType = "page" | "profile" | "company" | "channel" | "personal";
export type ContentStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "paused";
export type PostStatus = "pending" | "processing" | "published" | "failed" | "cancelled" | "paused";
export type MessageType = "comment" | "dm" | "mention" | "review";
export type MessageStatus = "unread" | "read" | "replied" | "archived" | "flagged" | "spam";
export type SocialAccountStatus = "active" | "expired" | "revoked" | "error" | "paused";
export type UserPlan = "free" | "starter" | "pro" | "agency";
export type BrandTone = "professional" | "casual" | "friendly" | "authoritative" | "humorous" | "inspirational";
export type FileType = "image" | "video" | "gif" | "document";
export type GenerationType = "caption" | "hashtags" | "reply" | "image" | "variation" | "seo" | "cta" | "first_comment";

// ============================================================
// USER
// ============================================================
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: UserPlan;
  timezone: string;
  onboarding_completed: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================
// BRAND
// ============================================================
export interface Brand {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  industry: string | null;
  tone: BrandTone;
  voice_description: string | null;
  default_hashtags: string[];
  banned_words: string[];
  cta_style: string | null;
  working_hours: WorkingHours;
  require_approval: boolean;
  auto_approve_ai: boolean;
  is_active: boolean;
  color: string;
  created_at: string;
  updated_at: string;
  // Relations
  social_accounts?: SocialAccount[];
  _count?: { content_items: number; social_accounts: number };
}

export interface WorkingHours {
  monday?: WorkingDay;
  tuesday?: WorkingDay;
  wednesday?: WorkingDay;
  thursday?: WorkingDay;
  friday?: WorkingDay;
  saturday?: WorkingDay;
  sunday?: WorkingDay;
}

export interface WorkingDay {
  enabled: boolean;
  start: string; // "09:00"
  end: string;   // "17:00"
}

// ============================================================
// SOCIAL ACCOUNT
// ============================================================
export interface SocialAccount {
  id: string;
  brand_id: string;
  user_id: string;
  platform: Platform;
  account_type: AccountType;
  platform_account_id: string;
  platform_account_name: string;
  platform_username: string | null;
  avatar_url: string | null;
  // Tokens are never sent to frontend
  token_expires_at: string | null;
  token_scopes: string[];
  status: SocialAccountStatus;
  last_error: string | null;
  error_count: number;
  rate_limit_remaining: number | null;
  rate_limit_reset_at: string | null;
  daily_post_count: number;
  daily_post_reset_at: string | null;
  platform_metadata: Record<string, unknown>;
  connected_at: string;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// CONTENT ITEM
// ============================================================
export interface ContentItem {
  id: string;
  brand_id: string;
  user_id: string;
  target_platforms: Platform[];
  target_account_ids: string[];
  title: string | null;
  caption: string | null;
  hashtags: string[];
  first_comment: string | null;
  platform_overrides: PlatformOverrides;
  media_asset_ids: string[];
  link_url: string | null;
  link_preview: LinkPreview | null;
  status: ContentStatus;
  rejection_reason: string | null;
  ai_generated: boolean;
  ai_generation_id: string | null;
  scheduled_at: string | null;
  timezone: string;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  media_assets?: MediaAsset[];
  brand?: Brand;
  scheduled_posts?: ScheduledPost[];
}

export interface PlatformOverrides {
  facebook?: FacebookOverride;
  instagram?: InstagramOverride;
  linkedin?: LinkedInOverride;
  youtube?: YouTubeOverride;
}

export interface FacebookOverride {
  caption?: string;
  link?: string;
}

export interface InstagramOverride {
  caption?: string;
}

export interface LinkedInOverride {
  caption?: string;
  article_url?: string;
  article_title?: string;
  article_description?: string;
}

export interface YouTubeOverride {
  title?: string;
  description?: string;
  tags?: string[];
  category_id?: string;
  privacy_status?: "public" | "private" | "unlisted";
  is_short?: boolean;
  thumbnail_asset_id?: string;
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
}

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  days_of_week?: number[];
  end_date?: string;
  max_occurrences?: number;
}

// ============================================================
// SCHEDULED POST
// ============================================================
export interface ScheduledPost {
  id: string;
  content_item_id: string;
  brand_id: string;
  user_id: string;
  social_account_id: string;
  platform: Platform;
  scheduled_at: string;
  timezone: string;
  status: PostStatus;
  platform_post_id: string | null;
  platform_post_url: string | null;
  published_at: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  job_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  content_item?: ContentItem;
  social_account?: SocialAccount;
}

// ============================================================
// MEDIA ASSET
// ============================================================
export interface MediaAsset {
  id: string;
  brand_id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_type: FileType;
  mime_type: string;
  file_size_bytes: number;
  s3_key: string;
  s3_bucket: string;
  cdn_url: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  thumbnail_s3_key: string | null;
  thumbnail_cdn_url: string | null;
  alt_text: string | null;
  tags: string[];
  folder: string | null;
  ai_generated: boolean;
  ai_prompt: string | null;
  status: "active" | "archived" | "deleted";
  created_at: string;
  updated_at: string;
}

// ============================================================
// INBOX MESSAGE
// ============================================================
export interface InboxMessage {
  id: string;
  brand_id: string;
  user_id: string;
  social_account_id: string | null;
  platform: Platform;
  message_type: MessageType;
  platform_message_id: string;
  platform_parent_id: string | null;
  platform_post_id: string | null;
  sender_id: string | null;
  sender_name: string | null;
  sender_username: string | null;
  sender_avatar_url: string | null;
  content: string;
  sentiment: "positive" | "neutral" | "negative" | "unknown" | null;
  language: string;
  status: MessageStatus;
  ai_reply_suggestions: AiReplySuggestion[] | null;
  is_hidden: boolean;
  moderation_notes: string | null;
  platform_created_at: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiReplySuggestion {
  text: string;
  tone: string;
  confidence: number;
}

// ============================================================
// ANALYTICS
// ============================================================
export interface Analytics {
  id: string;
  brand_id: string;
  user_id: string;
  social_account_id: string | null;
  scheduled_post_id: string | null;
  platform: Platform;
  platform_post_id: string | null;
  recorded_date: string;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  video_views: number;
  video_watch_time_seconds: number;
  profile_visits: number;
  followers_gained: number;
  followers_lost: number;
  engagement_rate: number | null;
  raw_metrics: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================
// AI GENERATION
// ============================================================
export interface AiGeneration {
  id: string;
  brand_id: string;
  user_id: string;
  generation_type: GenerationType;
  prompt: string | null;
  context_data: Record<string, unknown> | null;
  result: Record<string, unknown>;
  model_used: string;
  tokens_used: number | null;
  was_used: boolean;
  rating: number | null;
  status: "pending" | "completed" | "failed";
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

// ============================================================
// PLATFORM-SPECIFIC API TYPES
// ============================================================
export interface OAuthState {
  brand_id: string;
  user_id: string;
  platform: Platform;
  account_type: AccountType;
  timestamp: number;
}

export interface PublishPayload {
  scheduled_post_id: string;
  content_item_id: string;
  social_account_id: string;
  platform: Platform;
  caption: string;
  hashtags: string[];
  media_urls: string[];
  platform_overrides: PlatformOverrides;
}

export interface PublishResult {
  success: boolean;
  platform_post_id?: string;
  platform_post_url?: string;
  error?: string;
  error_code?: string;
}

// ============================================================
// QUEUE TYPES
// ============================================================
export interface PublishJobData {
  scheduled_post_id: string;
  attempt: number;
}

export interface SyncInboxJobData {
  brand_id: string;
  social_account_id: string;
  platform: Platform;
}

// ============================================================
// FORM TYPES
// ============================================================
export interface CreateBrandInput {
  name: string;
  slug: string;
  description?: string;
  website?: string;
  industry?: string;
  tone: BrandTone;
  voice_description?: string;
  default_hashtags?: string[];
  banned_words?: string[];
  cta_style?: string;
  color?: string;
}

export interface CreateContentInput {
  brand_id: string;
  target_platforms: Platform[];
  target_account_ids: string[];
  title?: string;
  caption?: string;
  hashtags?: string[];
  first_comment?: string;
  platform_overrides?: PlatformOverrides;
  media_asset_ids?: string[];
  link_url?: string;
  scheduled_at?: string;
  timezone?: string;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule;
  tags?: string[];
  notes?: string;
}

export interface GenerateCaptionInput {
  brand_id: string;
  topic: string;
  platform: Platform;
  tone?: BrandTone;
  keywords?: string[];
  target_audience?: string;
  include_cta?: boolean;
}

export interface GenerateReplyInput {
  brand_id: string;
  message: InboxMessage;
  tone?: string;
  language?: string;
}
