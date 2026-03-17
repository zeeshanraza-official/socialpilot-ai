import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import mime from "mime-types";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET!;
const CDN_URL = process.env.AWS_CLOUDFRONT_URL;

/**
 * Generate a signed upload URL for client-side uploads
 * Expires in 10 minutes
 */
export async function generateUploadUrl(params: {
  brand_id: string;
  user_id: string;
  filename: string;
  mime_type: string;
  folder?: string;
}): Promise<{ upload_url: string; s3_key: string; cdn_url: string }> {
  const ext = mime.extension(params.mime_type) || "bin";
  const safeFilename = `${nanoid()}.${ext}`;
  const folder = params.folder || "uploads";
  const s3_key = `brands/${params.brand_id}/${folder}/${safeFilename}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3_key,
    ContentType: params.mime_type,
    Metadata: {
      user_id: params.user_id,
      brand_id: params.brand_id,
      original_filename: params.filename,
    },
    // Enforce server-side encryption
    ServerSideEncryption: "AES256",
  });

  const upload_url = await getSignedUrl(s3Client, command, { expiresIn: 600 });
  const cdn_url = CDN_URL
    ? `${CDN_URL}/${s3_key}`
    : `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3_key}`;

  return { upload_url, s3_key, cdn_url };
}

/**
 * Generate a signed download URL for private assets
 * Expires in 1 hour by default
 */
export async function generateDownloadUrl(
  s3_key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: s3_key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete an object from S3
 */
export async function deleteObject(s3_key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: s3_key,
  });

  await s3Client.send(command);
}

/**
 * Check if an object exists
 */
export async function objectExists(s3_key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: s3_key,
    });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Upload buffer directly (for AI-generated images, thumbnails)
 */
export async function uploadBuffer(params: {
  buffer: Buffer;
  s3_key: string;
  mime_type: string;
  metadata?: Record<string, string>;
}): Promise<{ s3_key: string; cdn_url: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: params.s3_key,
    Body: params.buffer,
    ContentType: params.mime_type,
    ServerSideEncryption: "AES256",
    Metadata: params.metadata,
  });

  await s3Client.send(command);

  const cdn_url = CDN_URL
    ? `${CDN_URL}/${params.s3_key}`
    : `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.s3_key}`;

  return { s3_key: params.s3_key, cdn_url };
}

/**
 * Get CDN URL for a key (prefers CloudFront)
 */
export function getCdnUrl(s3_key: string): string {
  if (CDN_URL) {
    return `${CDN_URL}/${s3_key}`;
  }
  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3_key}`;
}

/**
 * Validate allowed file types for platform compliance
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/mov",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-ms-wmv",
];

export const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export const MAX_FILE_SIZE = 512 * 1024 * 1024; // 512MB

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

export function getFileType(mimeType: string): "image" | "video" | "gif" | null {
  if (mimeType === "image/gif") return "gif";
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return "image";
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return "video";
  return null;
}
