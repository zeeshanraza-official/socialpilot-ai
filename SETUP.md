# SocialPilot AI — Setup Guide

## Prerequisites

- Node.js 18+
- Supabase project
- AWS S3 bucket
- OpenAI API key
- Meta Developer App (Facebook/Instagram)
- LinkedIn Developer App
- Google Cloud project (YouTube)

---

## 1. Clone & Install

```bash
npm install
```

---

## 2. Environment Variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`.

---

## 3. Supabase Setup

### 3a. Create project at supabase.com

### 3b. Run migrations in Supabase SQL Editor

```sql
-- Run in order:
-- 1. database/schema.sql
-- 2. database/rls_policies.sql
-- 3. database/seed.sql
```

### 3c. Configure Auth

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/api/auth/callback`

### 3d. Get credentials

From Supabase Dashboard → Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 4. AWS S3 Setup

### Create S3 Bucket

1. Create bucket with name matching `AWS_S3_BUCKET`
2. **Block ALL public access** (required for security)
3. Enable server-side encryption (AES-256)
4. CORS configuration:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

### Create IAM User

Attach policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

### Optional: CloudFront CDN

Create CloudFront distribution pointing to S3 bucket.
Set `AWS_CLOUDFRONT_URL` to the distribution domain.

---

## 5. Social Platform Apps

### Facebook / Instagram

1. Create Meta App at developers.facebook.com
2. Add Facebook Login + Instagram Basic Display + Instagram Graph API
3. Set Valid OAuth Redirect URIs: `http://localhost:3000/api/social/callback/facebook`
4. Copy App ID → `META_APP_ID`
5. Copy App Secret → `META_APP_SECRET`

### LinkedIn

1. Create app at linkedin.com/developers
2. Add OAuth 2.0 redirect URL: `http://localhost:3000/api/social/callback/linkedin`
3. Request scopes: `r_liteprofile`, `r_emailaddress`, `w_member_social`, `w_organization_social`
4. Copy Client ID → `LINKEDIN_CLIENT_ID`
5. Copy Client Secret → `LINKEDIN_CLIENT_SECRET`

### YouTube / Google

1. Create project at console.cloud.google.com
2. Enable YouTube Data API v3
3. Create OAuth 2.0 Client ID
4. Authorized redirect URIs: `http://localhost:3000/api/social/callback/youtube`
5. Copy Client ID → `GOOGLE_CLIENT_ID`
6. Copy Client Secret → `GOOGLE_CLIENT_SECRET`

---

## 6. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## 7. Scheduled Post Processing

The queue processor needs to be called regularly. Options:

### Option A: Supabase pg_cron (Recommended)

In Supabase SQL Editor, enable `pg_cron` extension and run the cron job from `database/seed.sql`.

### Option B: External cron service

Set up a cron job to POST to `/api/queue/process` every minute:

```bash
curl -X POST https://yourdomain.com/api/queue/process \
  -H "Authorization: Bearer YOUR_APP_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Option C: Vercel Cron (if deploying to Vercel)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/queue/process",
    "schedule": "* * * * *"
  }]
}
```

---

## 8. Production Deployment

### Security Checklist

- [ ] All environment variables set in production
- [ ] `TOKEN_ENCRYPTION_KEY` is 32+ characters, random
- [ ] `APP_SECRET_KEY` is 32+ characters, random
- [ ] S3 bucket is private (no public access)
- [ ] Supabase RLS policies are active
- [ ] HTTPS enabled on all endpoints
- [ ] Rate limiting configured

### Deploy to Vercel

```bash
npm run build  # Verify build succeeds
vercel --prod
```

---

## Architecture Overview

```
User Browser
    │
    ▼
Next.js App (App Router)
├── /app/(auth)/          # Login, Register, Forgot Password
├── /app/(dashboard)/     # Protected dashboard pages
│   ├── page.tsx          # Overview
│   ├── brands/           # Brand management
│   ├── compose/          # Post composer
│   ├── calendar/         # Scheduler
│   ├── inbox/            # Unified inbox
│   ├── analytics/        # Performance analytics
│   ├── media/            # Media library
│   └── settings/         # Account settings
├── /app/api/             # API Routes
│   ├── brands/           # Brand CRUD
│   ├── posts/            # Content management
│   ├── social/           # OAuth + callbacks
│   ├── ai/               # AI generation
│   ├── media/            # File upload
│   ├── inbox/            # Messages + replies
│   ├── analytics/        # Analytics data
│   └── queue/process     # Job processor
    │
    ├── Supabase (PostgreSQL + Auth + RLS)
    │   └── Encrypted OAuth tokens
    │
    ├── AWS S3 (Private media storage)
    │   └── CloudFront CDN (optional)
    │
    ├── OpenAI API
    │   ├── GPT-4o-mini (captions, replies, hashtags)
    │   └── DALL-E 3 (image generation)
    │
    └── Social Platform APIs
        ├── Facebook Graph API v21
        ├── Instagram Graph API
        ├── LinkedIn API v2
        └── YouTube Data API v3
```

---

## Compliance Notes

This platform strictly uses:
- **Official APIs only** — no scraping, no browser automation
- **User-controlled automation** — AI suggestions require human approval
- **Rate limiting** — per-platform, per-account limits enforced
- **Circuit breaker** — auto-pause on repeated failures
- **Audit logging** — all actions logged with immutable records
- **Encrypted tokens** — OAuth tokens never exposed to frontend
