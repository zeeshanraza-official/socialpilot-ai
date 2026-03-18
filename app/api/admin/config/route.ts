import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/api/admin-auth";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/api/response";
import { AuthError, ForbiddenError } from "@/lib/api/auth";

const check = (key: string) => !!process.env[key];
const value = (key: string, fallback = "") => process.env[key] || fallback;

export async function GET() {
  try {
    await requireAdminAuth();

    return NextResponse.json({
      data: {
        appUrl: value("NEXT_PUBLIC_APP_URL", "https://socialpilot-ai.vercel.app"),
        groups: [
          {
            label: "Core",
            vars: [
              { key: "NEXT_PUBLIC_SUPABASE_URL", set: check("NEXT_PUBLIC_SUPABASE_URL"), public: true },
              { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", set: check("NEXT_PUBLIC_SUPABASE_ANON_KEY"), public: true },
              { key: "SUPABASE_SERVICE_ROLE_KEY", set: check("SUPABASE_SERVICE_ROLE_KEY"), public: false },
              { key: "NEXT_PUBLIC_APP_URL", set: check("NEXT_PUBLIC_APP_URL"), public: true },
              { key: "APP_SECRET_KEY", set: check("APP_SECRET_KEY"), public: false },
              { key: "TOKEN_ENCRYPTION_KEY", set: check("TOKEN_ENCRYPTION_KEY"), public: false },
            ],
          },
          {
            label: "AI",
            vars: [
              { key: "OPENAI_API_KEY", set: check("OPENAI_API_KEY"), public: false },
              { key: "OPENAI_MODEL", set: check("OPENAI_MODEL"), public: false, note: value("OPENAI_MODEL", "gpt-4o-mini (default)") },
            ],
          },
          {
            label: "Social Platforms",
            vars: [
              { key: "META_APP_ID", set: check("META_APP_ID"), public: false },
              { key: "META_APP_SECRET", set: check("META_APP_SECRET"), public: false },
              { key: "LINKEDIN_CLIENT_ID", set: check("LINKEDIN_CLIENT_ID"), public: false },
              { key: "LINKEDIN_CLIENT_SECRET", set: check("LINKEDIN_CLIENT_SECRET"), public: false },
              { key: "GOOGLE_CLIENT_ID", set: check("GOOGLE_CLIENT_ID"), public: false },
              { key: "GOOGLE_CLIENT_SECRET", set: check("GOOGLE_CLIENT_SECRET"), public: false },
            ],
          },
          {
            label: "Media Storage (AWS)",
            vars: [
              { key: "AWS_ACCESS_KEY_ID", set: check("AWS_ACCESS_KEY_ID"), public: false },
              { key: "AWS_SECRET_ACCESS_KEY", set: check("AWS_SECRET_ACCESS_KEY"), public: false },
              { key: "AWS_REGION", set: check("AWS_REGION"), public: false, note: value("AWS_REGION") },
              { key: "AWS_S3_BUCKET", set: check("AWS_S3_BUCKET"), public: false, note: value("AWS_S3_BUCKET") },
              { key: "AWS_CLOUDFRONT_URL", set: check("AWS_CLOUDFRONT_URL"), public: false },
            ],
          },
          {
            label: "Queue",
            vars: [
              { key: "REDIS_URL", set: check("REDIS_URL"), public: false },
            ],
          },
          {
            label: "Admin",
            vars: [
              { key: "ADMIN_EMAIL", set: check("ADMIN_EMAIL"), public: false },
            ],
          },
        ],
      },
    });
  } catch (error: unknown) {
    if (error instanceof AuthError) return unauthorizedResponse();
    if (error instanceof ForbiddenError) return forbiddenResponse();
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
