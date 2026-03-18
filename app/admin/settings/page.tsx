import { SettingsClient } from "./settings-client";

const check = (key: string) => !!process.env[key];
const val = (key: string, fallback = "") => process.env[key] || fallback;

export default function AdminSettingsPage() {
  const appUrl = val("NEXT_PUBLIC_APP_URL", "https://socialpilot-ai.vercel.app");

  const groups = [
    {
      label: "Core Application",
      vars: [
        { key: "NEXT_PUBLIC_SUPABASE_URL", set: check("NEXT_PUBLIC_SUPABASE_URL"), desc: "Supabase project URL" },
        { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", set: check("NEXT_PUBLIC_SUPABASE_ANON_KEY"), desc: "Supabase anon/public key" },
        { key: "SUPABASE_SERVICE_ROLE_KEY", set: check("SUPABASE_SERVICE_ROLE_KEY"), desc: "Supabase service role key (server-only)" },
        { key: "NEXT_PUBLIC_APP_URL", set: check("NEXT_PUBLIC_APP_URL"), desc: `App URL (currently: ${appUrl})` },
        { key: "APP_SECRET_KEY", set: check("APP_SECRET_KEY"), desc: "32+ char secret for signing (generate a random string)" },
        { key: "TOKEN_ENCRYPTION_KEY", set: check("TOKEN_ENCRYPTION_KEY"), desc: "32+ char key for encrypting OAuth tokens" },
        { key: "ADMIN_EMAIL", set: check("ADMIN_EMAIL"), desc: "Email address that has admin panel access" },
      ],
    },
    {
      label: "AI (OpenAI)",
      vars: [
        { key: "OPENAI_API_KEY", set: check("OPENAI_API_KEY"), desc: "OpenAI secret key (sk-...)" },
        { key: "OPENAI_MODEL", set: check("OPENAI_MODEL"), desc: `Model to use (current: ${val("OPENAI_MODEL", "gpt-4o-mini")})` },
      ],
    },
    {
      label: "Meta — Facebook & Instagram",
      vars: [
        { key: "META_APP_ID", set: check("META_APP_ID"), desc: "Facebook App ID from developers.facebook.com" },
        { key: "META_APP_SECRET", set: check("META_APP_SECRET"), desc: "Facebook App Secret" },
      ],
    },
    {
      label: "LinkedIn",
      vars: [
        { key: "LINKEDIN_CLIENT_ID", set: check("LINKEDIN_CLIENT_ID"), desc: "LinkedIn OAuth 2.0 Client ID" },
        { key: "LINKEDIN_CLIENT_SECRET", set: check("LINKEDIN_CLIENT_SECRET"), desc: "LinkedIn OAuth 2.0 Client Secret" },
      ],
    },
    {
      label: "Google — YouTube",
      vars: [
        { key: "GOOGLE_CLIENT_ID", set: check("GOOGLE_CLIENT_ID"), desc: "Google OAuth 2.0 Client ID" },
        { key: "GOOGLE_CLIENT_SECRET", set: check("GOOGLE_CLIENT_SECRET"), desc: "Google OAuth 2.0 Client Secret" },
      ],
    },
    {
      label: "AWS S3 — Media Storage",
      vars: [
        { key: "AWS_ACCESS_KEY_ID", set: check("AWS_ACCESS_KEY_ID"), desc: "IAM user access key" },
        { key: "AWS_SECRET_ACCESS_KEY", set: check("AWS_SECRET_ACCESS_KEY"), desc: "IAM user secret key" },
        { key: "AWS_REGION", set: check("AWS_REGION"), desc: `S3 bucket region (current: ${val("AWS_REGION", "not set")})` },
        { key: "AWS_S3_BUCKET", set: check("AWS_S3_BUCKET"), desc: `S3 bucket name (current: ${val("AWS_S3_BUCKET", "not set")})` },
        { key: "AWS_CLOUDFRONT_URL", set: check("AWS_CLOUDFRONT_URL"), desc: "CloudFront distribution URL (optional, for CDN)" },
      ],
    },
    {
      label: "Redis — Job Queue",
      vars: [
        { key: "REDIS_URL", set: check("REDIS_URL"), desc: "Redis connection URL (e.g. from Upstash)" },
      ],
    },
  ];

  const totalVars = groups.reduce((s, g) => s + g.vars.length, 0);
  const setVars = groups.reduce((s, g) => s + g.vars.filter((v) => v.set).length, 0);

  return <SettingsClient groups={groups} totalVars={totalVars} setVars={setVars} appUrl={appUrl} />;
}
