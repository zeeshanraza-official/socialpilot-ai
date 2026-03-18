"use client";

import { useState } from "react";
import {
  CheckCircle2, XCircle, Copy, Check, ChevronDown,
  ChevronRight, ExternalLink, Info, AlertTriangle, ShieldCheck,
} from "lucide-react";

interface EnvVar { key: string; set: boolean; desc: string }
interface Group { label: string; vars: EnvVar[] }

interface Props {
  groups: Group[];
  totalVars: number;
  setVars: number;
  appUrl: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="ml-2 p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function EnvVarRow({ v }: { v: EnvVar }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <div className="mt-0.5 flex-shrink-0">
        {v.set
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : <XCircle className="w-4 h-4 text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
            {v.key}
          </code>
          <CopyButton text={v.key} />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{v.desc}</p>
      </div>
      <span className={`text-xs font-medium flex-shrink-0 ${v.set ? "text-green-600" : "text-red-500"}`}>
        {v.set ? "Set" : "Missing"}
      </span>
    </div>
  );
}

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 bg-white border-t border-slate-100">{children}</div>}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5">
      <div className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {n}
      </div>
      <div className="text-sm text-slate-700 leading-relaxed">{children}</div>
    </div>
  );
}

function Uri({ label, uri }: { label: string; uri: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 my-2">
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <div className="flex items-center gap-1">
        <code className="text-xs font-mono text-slate-800 flex-1 break-all">{uri}</code>
        <CopyButton text={uri} />
      </div>
    </div>
  );
}

function EnvBlock({ vars }: { vars: { key: string; value: string }[] }) {
  const text = vars.map((v) => `${v.key}=${v.value}`).join("\n");
  return (
    <div className="bg-slate-900 rounded-lg p-3 my-2 relative">
      <pre className="text-xs text-slate-300 font-mono whitespace-pre">{text}</pre>
      <CopyButton text={text} />
    </div>
  );
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="text-brand-600 hover:underline inline-flex items-center gap-1">
      {children}<ExternalLink className="w-3 h-3" />
    </a>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start p-3 my-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start p-3 my-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
      <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Req({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start p-3 my-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800">
      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-4 mb-1">{children}</p>
  );
}

function PermissionList({ items }: { items: { scope: string; description: string; review?: boolean }[] }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden my-2 divide-y divide-slate-100">
      {items.map((item) => (
        <div key={item.scope} className="flex items-start gap-3 px-3 py-2 bg-white">
          <code className="text-xs font-mono bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">{item.scope}</code>
          <span className="text-xs text-slate-600 flex-1">{item.description}</span>
          {item.review && (
            <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded flex-shrink-0">App Review</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function SettingsClient({ groups, totalVars, setVars, appUrl }: Props) {
  const [activeTab, setActiveTab] = useState<"status" | "guides">("status");
  const pct = Math.round((setVars / totalVars) * 100);

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings & Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">Environment variables status and platform setup guides.</p>
      </div>

      {/* Summary bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-6">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-medium text-slate-700">{setVars} of {totalVars} variables configured</span>
            <span className="font-semibold text-slate-800">{pct}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex gap-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-lg font-bold text-green-600">{setVars}</p>
            <p className="text-xs text-slate-500">Configured</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-500">{totalVars - setVars}</p>
            <p className="text-xs text-slate-500">Missing</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { id: "status", label: "Environment Variables" },
          { id: "guides", label: "Platform Setup Guides" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "status" | "guides")}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Env Vars Status */}
      {activeTab === "status" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
            <Info className="w-4 h-4 flex-shrink-0" />
            Set these in <strong className="mx-1">Vercel → Project → Settings → Environment Variables</strong>.
            Redeploy after adding new variables.
          </div>
          {groups.map((group) => (
            <div key={group.label} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">{group.label}</h3>
                <span className="text-xs text-slate-400">
                  {group.vars.filter((v) => v.set).length}/{group.vars.length} set
                </span>
              </div>
              <div className="px-5 py-1">
                {group.vars.map((v) => <EnvVarRow key={v.key} v={v} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Platform Guides */}
      {activeTab === "guides" && (
        <div className="space-y-3">

          {/* Vercel */}
          <GuideSection title="📦 How to Set Environment Variables in Vercel">
            <div className="space-y-1 mt-3">
              <Step n={1}>Go to <Link href="https://vercel.com/dashboard">vercel.com/dashboard</Link> and open your project.</Step>
              <Step n={2}>Click <strong>Settings</strong> → <strong>Environment Variables</strong>.</Step>
              <Step n={3}>For each variable, enter the <strong>Key</strong> (exact name) and <strong>Value</strong>. Select <strong>All Environments</strong> (or at least Production).</Step>
              <Step n={4}>Click <strong>Save</strong>. After adding all variables, go to <strong>Deployments</strong> and click <strong>Redeploy</strong> on the latest deployment.</Step>
              <Tip>Variables are encrypted at rest. Never paste secrets in plain text anywhere else.</Tip>
            </div>
          </GuideSection>

          {/* Supabase */}
          <GuideSection title="🗄️ Supabase — Database & Auth">
            <div className="space-y-1 mt-3">
              <Req><strong>Requirements:</strong> Free Supabase account. No business verification needed. Free tier supports up to 500 MB database and 50,000 monthly active users.</Req>
              <Step n={1}>Go to <Link href="https://supabase.com">supabase.com</Link>, create an account, and click <strong>New Project</strong>.</Step>
              <Step n={2}>Choose your organization, give the project a name, set a strong database password, and select a region closest to your users.</Step>
              <Step n={3}>Once created, go to <strong>Project Settings → API</strong>. Copy:
                <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs text-slate-600">
                  <li><strong>Project URL</strong> → <code className="text-xs bg-slate-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code></li>
                  <li><strong>anon public</strong> key → <code className="text-xs bg-slate-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
                  <li><strong>service_role</strong> secret key → <code className="text-xs bg-slate-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code></li>
                </ul>
              </Step>
              <Step n={4}>Go to <strong>Authentication → URL Configuration</strong>. Set <strong>Site URL</strong> to your app URL:
                <Uri label="Site URL" uri={appUrl} />
              </Step>
              <Step n={5}>Add these to <strong>Redirect URLs</strong>:
                <Uri label="Production" uri={`${appUrl}/**`} />
                <Uri label="Local dev" uri="http://localhost:3000/**" />
              </Step>
              <Step n={6}>Go to the <strong>SQL Editor</strong> in Supabase and run your schema migration SQL to create tables, RLS policies, and seed data.</Step>
              <Warn>Never expose the <code>service_role</code> key in client-side code. It bypasses all Row-Level Security policies.</Warn>
            </div>
          </GuideSection>

          {/* Meta / Facebook / Instagram */}
          <GuideSection title="📘 Meta — Facebook Pages & Instagram">
            <div className="space-y-1 mt-3">

              <Req>
                <strong>Account Requirements:</strong>
                <ul className="list-disc ml-4 mt-1 space-y-0.5">
                  <li>A personal Facebook account (used for Meta developer login)</li>
                  <li>A <strong>Facebook Page</strong> (not a personal profile) — required for publishing</li>
                  <li>An <strong>Instagram Professional Account</strong> (Creator or Business) connected to that Facebook Page — required for Instagram posting</li>
                  <li>A <strong>Meta Business Portfolio</strong> (formerly Business Manager) is strongly recommended for production apps requiring App Review</li>
                </ul>
              </Req>

              <SectionLabel>Step 1 — Create the Meta App</SectionLabel>
              <Step n={1}>Go to <Link href="https://developers.facebook.com/apps">developers.facebook.com/apps</Link> and click <strong>Create App</strong>.</Step>
              <Step n={2}>When asked <em>"What do you want your app to do?"</em>, select <strong>Other</strong> (do NOT pick "Authenticate and request data from users" unless you only need login).</Step>
              <Step n={3}>On the next screen, for app type, select <strong>Business</strong>. This unlocks the required Instagram and Page permissions.</Step>
              <Step n={4}>Fill in your <strong>App Display Name</strong>, contact email, and optionally link a <strong>Business Portfolio</strong>. Click <strong>Create App</strong>.</Step>

              <SectionLabel>Step 2 — Add Required Products</SectionLabel>
              <Step n={5}>In your app dashboard, click <strong>Add a Product</strong>. Add the following products:
                <div className="border border-slate-200 rounded-lg overflow-hidden my-2 divide-y divide-slate-100">
                  {[
                    { product: "Facebook Login for Business", reason: "Handles OAuth flow for connecting Facebook Pages and Instagram accounts" },
                    { product: "Instagram Graph API", reason: "Required to publish content, manage media, and read insights for Instagram" },
                    { product: "Webhooks", reason: "Optional — receive real-time updates for comments, messages, and mentions" },
                  ].map((p) => (
                    <div key={p.product} className="flex items-start gap-3 px-3 py-2 bg-white">
                      <span className="text-xs font-semibold text-slate-800 flex-shrink-0 w-48">{p.product}</span>
                      <span className="text-xs text-slate-600">{p.reason}</span>
                    </div>
                  ))}
                </div>
              </Step>

              <SectionLabel>Step 3 — Configure Facebook Login</SectionLabel>
              <Step n={6}>Go to <strong>Facebook Login for Business → Settings</strong>. Under <strong>Valid OAuth Redirect URIs</strong>, add:
                <Uri label="Facebook OAuth callback" uri={`${appUrl}/api/social/callback/facebook`} />
                <Uri label="Instagram OAuth callback" uri={`${appUrl}/api/social/callback/instagram`} />
              </Step>

              <SectionLabel>Step 4 — Get App Credentials</SectionLabel>
              <Step n={7}>Go to <strong>App Settings → Basic</strong>. Copy <strong>App ID</strong> and <strong>App Secret</strong>:
                <EnvBlock vars={[{ key: "META_APP_ID", value: "your_app_id" }, { key: "META_APP_SECRET", value: "your_app_secret" }]} />
              </Step>

              <SectionLabel>Step 5 — Required Permissions</SectionLabel>
              <Step n={8}>The following permissions are needed. Permissions marked <strong>App Review</strong> require submitting a review before real users can grant them (in Development mode, only test users and app admins can use them):
                <PermissionList items={[
                  { scope: "pages_manage_posts", description: "Create, edit, and delete posts on Facebook Pages you manage", review: true },
                  { scope: "pages_read_engagement", description: "Read page content, engagement metrics, and fan data", review: true },
                  { scope: "pages_show_list", description: "Access the list of Pages a person manages", review: false },
                  { scope: "instagram_basic", description: "Read basic Instagram account info and media", review: false },
                  { scope: "instagram_content_publish", description: "Publish photos, Reels, and carousels to Instagram Business/Creator accounts", review: true },
                  { scope: "instagram_manage_insights", description: "Read Instagram account and media insights/analytics", review: true },
                  { scope: "instagram_manage_comments", description: "Read and reply to comments on Instagram media", review: true },
                  { scope: "business_management", description: "Required to access pages and assets within a Business Portfolio", review: false },
                ]} />
              </Step>

              <SectionLabel>Step 6 — App Review (for Production)</SectionLabel>
              <Step n={9}><strong>Development mode:</strong> Your app starts in Development mode. Only users listed as <strong>Testers</strong>, <strong>Developers</strong>, or <strong>Admins</strong> in the app can connect and use permissions. Add test users at <strong>Roles → Roles → Add Testers</strong>.</Step>
              <Step n={10}><strong>App Review:</strong> To allow any user to connect their accounts, submit each permission for App Review. You will need to:
                <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs text-slate-600">
                  <li>Record a <strong>screen capture video</strong> demonstrating each permission being used</li>
                  <li>Write a detailed use-case description explaining why your app needs the permission</li>
                  <li>Link your app to a verified <strong>Business Portfolio</strong></li>
                  <li>Your app domain must match the <strong>Privacy Policy URL</strong> and <strong>Terms of Service URL</strong> set in App Settings → Basic</li>
                </ul>
              </Step>
              <Step n={11}>Once App Review is approved, go to <strong>App Mode</strong> (top of the dashboard) and switch from <strong>Development</strong> to <strong>Live</strong>.</Step>
              <Warn>Instagram posting requires the Instagram account to be a <strong>Professional Account</strong> (Business or Creator) — personal Instagram accounts cannot publish via the API.</Warn>
              <Warn>Facebook Pages posting uses the <strong>Page Access Token</strong>, not a user token. Long-lived page tokens should be stored securely in your database.</Warn>
            </div>
          </GuideSection>

          {/* LinkedIn */}
          <GuideSection title="💼 LinkedIn — Company Pages & Personal Profiles">
            <div className="space-y-1 mt-3">

              <Req>
                <strong>Account Requirements:</strong>
                <ul className="list-disc ml-4 mt-1 space-y-0.5">
                  <li>A <strong>LinkedIn personal account</strong> (used for developer login)</li>
                  <li>A <strong>LinkedIn Company Page</strong> — required to create a developer app</li>
                  <li>For <strong>Marketing Developer Platform</strong> (company page posting), LinkedIn may require your company to have a certain follower count and history</li>
                </ul>
              </Req>

              <SectionLabel>Step 1 — Create the Developer App</SectionLabel>
              <Step n={1}>Go to <Link href="https://www.linkedin.com/developers/apps/new">linkedin.com/developers/apps/new</Link>.</Step>
              <Step n={2}>Fill in:
                <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs text-slate-600">
                  <li><strong>App name</strong> — the name of your application</li>
                  <li><strong>LinkedIn Page</strong> — select your company page (must be one you admin)</li>
                  <li><strong>App logo</strong> — a square image, at least 100×100 px</li>
                </ul>
                Agree to the API terms and click <strong>Create app</strong>.
              </Step>

              <SectionLabel>Step 2 — Get App Credentials</SectionLabel>
              <Step n={3}>Go to the <strong>Auth</strong> tab. Copy:
                <EnvBlock vars={[{ key: "LINKEDIN_CLIENT_ID", value: "your_client_id" }, { key: "LINKEDIN_CLIENT_SECRET", value: "your_client_secret" }]} />
              </Step>
              <Step n={4}>In the <strong>Auth</strong> tab under <strong>Authorized redirect URLs for your app</strong>, add:
                <Uri label="LinkedIn OAuth callback" uri={`${appUrl}/api/social/callback/linkedin`} />
              </Step>

              <SectionLabel>Step 3 — Request Products</SectionLabel>
              <Step n={5}>Go to the <strong>Products</strong> tab and request access to the following products. Some are instant, others require LinkedIn review:
                <div className="border border-slate-200 rounded-lg overflow-hidden my-2 divide-y divide-slate-100">
                  {[
                    { product: "Sign In with LinkedIn using OpenID Connect", scopes: "openid, profile, email", approval: "Instant", note: "Required for user authentication / login with LinkedIn" },
                    { product: "Share on LinkedIn", scopes: "w_member_social", approval: "Instant", note: "Allows posting on behalf of a LinkedIn member (personal profile)" },
                    { product: "Marketing Developer Platform", scopes: "r_organization_social, w_organization_social, rw_organization_admin", approval: "Manual review (days to weeks)", note: "Required to post on Company Pages. LinkedIn may require business justification" },
                  ].map((p) => (
                    <div key={p.product} className="px-3 py-2.5 bg-white">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800">{p.product}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${p.approval === "Instant" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{p.approval}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{p.note}</p>
                      <code className="text-xs bg-slate-100 text-slate-600 px-1 rounded mt-0.5 inline-block">{p.scopes}</code>
                    </div>
                  ))}
                </div>
              </Step>

              <SectionLabel>Step 4 — Required OAuth Scopes</SectionLabel>
              <Step n={6}>Ensure the following scopes are included in your OAuth request:
                <PermissionList items={[
                  { scope: "openid", description: "OpenID Connect — required for Sign In with LinkedIn" },
                  { scope: "profile", description: "Access the member's name and profile picture" },
                  { scope: "email", description: "Access the member's primary email address" },
                  { scope: "w_member_social", description: "Post, comment, and like on behalf of a LinkedIn member" },
                  { scope: "r_organization_social", description: "Read posts, comments, and statistics of company pages you manage", review: true },
                  { scope: "w_organization_social", description: "Create posts on company pages you manage", review: true },
                  { scope: "rw_organization_admin", description: "Manage organization details and administrators", review: true },
                ]} />
              </Step>
              <Tip>Company page posting (<code>w_organization_social</code>) requires the user to be an <strong>admin or content manager</strong> of the LinkedIn Company Page. Regular members cannot post to company pages via the API.</Tip>
              <Warn>LinkedIn access tokens expire after <strong>60 days</strong>. Implement token refresh logic and prompt users to reconnect when their token expires.</Warn>
            </div>
          </GuideSection>

          {/* Google / YouTube */}
          <GuideSection title="▶️ Google — YouTube">
            <div className="space-y-1 mt-3">

              <Req>
                <strong>Account Requirements:</strong>
                <ul className="list-disc ml-4 mt-1 space-y-0.5">
                  <li>A <strong>Google account</strong> for accessing Google Cloud Console</li>
                  <li>A <strong>YouTube channel</strong> on the connected Google account — required for video uploads</li>
                  <li>For production apps (non-test users), your OAuth consent screen must pass <strong>Google Verification</strong></li>
                </ul>
              </Req>

              <SectionLabel>Step 1 — Create a Google Cloud Project</SectionLabel>
              <Step n={1}>Go to <Link href="https://console.cloud.google.com">console.cloud.google.com</Link>. Click the project dropdown at the top → <strong>New Project</strong>. Give it a name and click <strong>Create</strong>.</Step>

              <SectionLabel>Step 2 — Enable Required APIs</SectionLabel>
              <Step n={2}>Go to <strong>APIs & Services → Library</strong>. Search for and enable each of the following:
                <div className="border border-slate-200 rounded-lg overflow-hidden my-2 divide-y divide-slate-100">
                  {[
                    { api: "YouTube Data API v3", reason: "Core API for uploading videos, managing playlists, and reading channel data" },
                  ].map((a) => (
                    <div key={a.api} className="flex items-start gap-3 px-3 py-2 bg-white">
                      <span className="text-xs font-semibold text-slate-800 flex-shrink-0 w-48">{a.api}</span>
                      <span className="text-xs text-slate-600">{a.reason}</span>
                    </div>
                  ))}
                </div>
              </Step>

              <SectionLabel>Step 3 — Configure the OAuth Consent Screen</SectionLabel>
              <Step n={3}>Go to <strong>APIs & Services → OAuth consent screen</strong>. Select <strong>External</strong> (allows any Google account user) and click <strong>Create</strong>.</Step>
              <Step n={4}>Fill in the required fields:
                <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs text-slate-600">
                  <li><strong>App name</strong> — shown to users during the OAuth consent dialog</li>
                  <li><strong>User support email</strong> — your support email address</li>
                  <li><strong>App logo</strong> — shown in the consent screen (optional but recommended)</li>
                  <li><strong>Authorized domains</strong> — add your app domain (e.g., <code>socialpilot-ai.vercel.app</code>)</li>
                  <li><strong>Developer contact email</strong> — your email</li>
                </ul>
              </Step>
              <Step n={5}>Click <strong>Save and Continue</strong> to go to <strong>Scopes</strong>. Click <strong>Add or Remove Scopes</strong> and add:
                <PermissionList items={[
                  { scope: "https://www.googleapis.com/auth/youtube.upload", description: "Upload videos to YouTube on the user's behalf", review: true },
                  { scope: "https://www.googleapis.com/auth/youtube.readonly", description: "View YouTube account info, playlists, and channel data", review: false },
                  { scope: "https://www.googleapis.com/auth/youtube", description: "Full YouTube account management (use only if needed)", review: true },
                  { scope: "openid", description: "OpenID Connect identifier" },
                  { scope: "email", description: "Access the user's email address" },
                  { scope: "profile", description: "Access the user's name and profile photo" },
                ]} />
              </Step>
              <Step n={6}><strong>Testing mode:</strong> Add specific Google accounts as <strong>Test Users</strong> (up to 100). Only these users can authorize your app while it&apos;s in testing.</Step>

              <SectionLabel>Step 4 — Create OAuth Credentials</SectionLabel>
              <Step n={7}>Go to <strong>APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID</strong>.</Step>
              <Step n={8}>Select <strong>Web application</strong>. Under <strong>Authorized redirect URIs</strong>, add:
                <Uri label="YouTube OAuth callback" uri={`${appUrl}/api/social/callback/youtube`} />
              </Step>
              <Step n={9}>Copy the credentials:
                <EnvBlock vars={[{ key: "GOOGLE_CLIENT_ID", value: "your_client_id.apps.googleusercontent.com" }, { key: "GOOGLE_CLIENT_SECRET", value: "your_client_secret" }]} />
              </Step>

              <SectionLabel>Step 5 — Google Verification (Production)</SectionLabel>
              <Step n={10}>For non-test users to authorize your app, submit for <strong>Google Verification</strong> via the OAuth consent screen page. You will need to:
                <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs text-slate-600">
                  <li>Provide a <strong>Privacy Policy</strong> URL hosted on your domain</li>
                  <li>Provide a <strong>Terms of Service</strong> URL</li>
                  <li>For sensitive scopes (like <code>youtube.upload</code>), a <strong>video demo</strong> of your app may be required</li>
                  <li>Verification typically takes <strong>4–6 weeks</strong> for sensitive scopes</li>
                </ul>
              </Step>
              <Warn>YouTube video uploads require a YouTube channel on the user&apos;s Google account. Users who never set up a YouTube channel cannot upload videos even if authenticated.</Warn>
              <Tip>YouTube Data API v3 has a daily quota of <strong>10,000 units</strong> by default. Video uploads cost 1,600 units each. You can request a quota increase in the Google Cloud Console under <strong>APIs & Services → YouTube Data API v3 → Quotas</strong>.</Tip>
            </div>
          </GuideSection>

          {/* OpenAI */}
          <GuideSection title="🤖 OpenAI — AI Caption & Content Generation">
            <div className="space-y-1 mt-3">
              <Req><strong>Requirements:</strong> An OpenAI account with billing set up. No special approval needed — access is immediate after adding a payment method.</Req>
              <Step n={1}>Go to <Link href="https://platform.openai.com">platform.openai.com</Link> and sign in or create an account.</Step>
              <Step n={2}>Click your profile (top-right) → <strong>API Keys</strong> → <strong>Create new secret key</strong>.</Step>
              <Step n={3}>Give it a name (e.g. <code>socialpilot-ai-prod</code>), copy the key immediately — it won&apos;t be shown again:
                <EnvBlock vars={[{ key: "OPENAI_API_KEY", value: "sk-..." }, { key: "OPENAI_MODEL", value: "gpt-4o-mini" }]} />
              </Step>
              <Step n={4}>Set up billing at <Link href="https://platform.openai.com/billing">platform.openai.com/billing</Link>. Add a payment method. Set a <strong>monthly usage limit</strong> to prevent unexpected charges.</Step>
              <Step n={5}>Recommended models:
                <div className="border border-slate-200 rounded-lg overflow-hidden my-2 divide-y divide-slate-100">
                  {[
                    { model: "gpt-4o-mini", cost: "~$0.15/1M tokens in", use: "Best for captions, hashtags, and short content generation. Fast and very affordable." },
                    { model: "gpt-4o", cost: "~$2.50/1M tokens in", use: "Higher quality for complex content strategies. Use when quality matters more than cost." },
                  ].map((m) => (
                    <div key={m.model} className="px-3 py-2.5 bg-white">
                      <div className="flex items-center justify-between">
                        <code className="text-xs font-mono font-semibold text-slate-800">{m.model}</code>
                        <span className="text-xs text-slate-500">{m.cost}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{m.use}</p>
                    </div>
                  ))}
                </div>
              </Step>
              <Warn>Never expose your OpenAI API key in client-side code. All AI calls must go through your server-side API routes.</Warn>
            </div>
          </GuideSection>

          {/* AWS S3 */}
          <GuideSection title="☁️ AWS S3 — Media File Storage">
            <div className="space-y-1 mt-3">
              <Req><strong>Requirements:</strong> An AWS account (credit card required). S3 costs are usage-based — typically very low for a social media app (cents to a few dollars/month for moderate use).</Req>

              <SectionLabel>Step 1 — Create an IAM User</SectionLabel>
              <Step n={1}>Go to <Link href="https://console.aws.amazon.com">AWS Console</Link> → <strong>IAM</strong> → <strong>Users</strong> → <strong>Create user</strong>.</Step>
              <Step n={2}>Name the user (e.g. <code>socialpilot-ai-s3</code>). On the <strong>Permissions</strong> step, choose <strong>Attach policies directly</strong> and attach:
                <div className="border border-slate-200 rounded-lg overflow-hidden my-2 divide-y divide-slate-100">
                  {[
                    { policy: "AmazonS3FullAccess", note: "For simplicity. You can restrict to a specific bucket ARN for better security." },
                  ].map((p) => (
                    <div key={p.policy} className="flex items-start gap-3 px-3 py-2 bg-white">
                      <code className="text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded flex-shrink-0">{p.policy}</code>
                      <span className="text-xs text-slate-600">{p.note}</span>
                    </div>
                  ))}
                </div>
              </Step>
              <Step n={3}>After creating the user, go to the user → <strong>Security credentials → Create access key</strong>. Select <strong>Application running outside AWS</strong>. Copy:
                <EnvBlock vars={[{ key: "AWS_ACCESS_KEY_ID", value: "AKIA..." }, { key: "AWS_SECRET_ACCESS_KEY", value: "your_secret" }]} />
              </Step>

              <SectionLabel>Step 2 — Create an S3 Bucket</SectionLabel>
              <Step n={4}>Go to <strong>S3 → Create bucket</strong>. Choose a unique name and the same region as your app:
                <EnvBlock vars={[{ key: "AWS_S3_BUCKET", value: "your-bucket-name" }, { key: "AWS_REGION", value: "us-east-1" }]} />
              </Step>
              <Step n={5}>Under <strong>Block Public Access settings</strong>:
                <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs text-slate-600">
                  <li><strong>Keep all blocked</strong> if using CloudFront or pre-signed URLs (recommended)</li>
                  <li><strong>Unblock</strong> only if you want direct public URLs (less secure)</li>
                </ul>
              </Step>

              <SectionLabel>Step 3 — CORS Configuration</SectionLabel>
              <Step n={6}>In your bucket, go to <strong>Permissions → Cross-origin resource sharing (CORS)</strong>. Paste this JSON:
                <div className="bg-slate-900 rounded-lg p-3 my-2">
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre">{`[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["${appUrl}"],
    "ExposeHeaders": []
  }
]`}</pre>
                </div>
              </Step>

              <SectionLabel>Step 4 — CloudFront CDN (Optional but Recommended)</SectionLabel>
              <Step n={7}>For faster global media delivery, create a <strong>CloudFront distribution</strong> in the CloudFront console pointing to your S3 bucket as the origin. Copy the distribution domain:
                <EnvBlock vars={[{ key: "AWS_CLOUDFRONT_URL", value: "https://d1234abcd.cloudfront.net" }]} />
              </Step>
              <Tip>Use CloudFront + private S3 bucket for best security. Media URLs served through CloudFront are faster and your bucket stays private.</Tip>
            </div>
          </GuideSection>

          {/* Redis */}
          <GuideSection title="⚡ Redis — Background Job Queue (Upstash recommended)">
            <div className="space-y-1 mt-3">
              <Req><strong>Requirements:</strong> Free Upstash account. The free tier supports up to 10,000 commands/day and 256 MB data — sufficient for development and small production deployments.</Req>
              <Step n={1}>Go to <Link href="https://upstash.com">upstash.com</Link> and sign up (free tier available).</Step>
              <Step n={2}>Click <strong>Create Database</strong>. Choose <strong>Redis</strong>. Fill in:
                <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs text-slate-600">
                  <li><strong>Name</strong> — e.g., <code>socialpilot-queue</code></li>
                  <li><strong>Region</strong> — closest to your Vercel deployment region</li>
                  <li><strong>Type</strong> — Regional (single region) for low cost; Global for multi-region</li>
                </ul>
              </Step>
              <Step n={3}>Once created, go to the database details. Under <strong>Connect</strong> → <strong>Node.js</strong>, copy the <strong>REDIS_URL</strong>:
                <EnvBlock vars={[{ key: "REDIS_URL", value: "rediss://:password@hostname:port" }]} />
              </Step>
              <Step n={4}><strong>Alternative — Vercel KV:</strong> In your Vercel project dashboard, go to <strong>Storage → Create Database → KV</strong>. Vercel KV is powered by Upstash and automatically injects the <code>KV_URL</code> environment variable.</Step>
              <Tip>Redis is used for the post scheduling job queue (Bull/BullMQ). Without Redis, scheduled posts will not be processed. This is required for the scheduler to work.</Tip>
            </div>
          </GuideSection>

          {/* Security keys */}
          <GuideSection title="🔐 Generating Secure Secret Keys">
            <div className="space-y-1 mt-3">
              <Tip>These keys are used for encrypting social media OAuth tokens stored in your database. Use a different value for each key and never share or commit them to git.</Tip>
              <Step n={1}>For <code className="text-xs bg-slate-100 px-1 rounded">APP_SECRET_KEY</code> and <code className="text-xs bg-slate-100 px-1 rounded">TOKEN_ENCRYPTION_KEY</code>, generate random 32-byte (64-hex-character) strings.</Step>
              <Step n={2}>Use any of these methods:
                <div className="bg-slate-900 rounded-lg p-3 my-2 space-y-2">
                  <p className="text-xs text-slate-400 font-mono"># Node.js</p>
                  <pre className="text-xs text-slate-300 font-mono">node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;</pre>
                  <p className="text-xs text-slate-400 font-mono mt-2"># OpenSSL (macOS/Linux)</p>
                  <pre className="text-xs text-slate-300 font-mono">openssl rand -hex 32</pre>
                  <p className="text-xs text-slate-400 font-mono mt-2"># PowerShell (Windows)</p>
                  <pre className="text-xs text-slate-300 font-mono">{`-join ((0..31) | % {"{0:x2}" -f (Get-Random -Max 256)})`}</pre>
                </div>
              </Step>
              <Step n={3}>Run the command twice to get two different values — one for each key. Paste them directly into Vercel environment variables.</Step>
              <Warn>If you rotate (change) these keys after launch, all previously stored encrypted tokens will become unreadable and users will need to reconnect their social accounts.</Warn>
            </div>
          </GuideSection>

        </div>
      )}
    </div>
  );
}
