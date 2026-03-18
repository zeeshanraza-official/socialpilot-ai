"use client";

import { useState } from "react";
import {
  CheckCircle2, XCircle, Copy, Check, ChevronDown,
  ChevronRight, ExternalLink, Info,
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
            </div>
          </GuideSection>

          {/* Supabase */}
          <GuideSection title="🗄️ Supabase — Database & Auth">
            <div className="space-y-1 mt-3">
              <Step n={1}>Go to <Link href="https://supabase.com">supabase.com</Link>, create an account, and click <strong>New Project</strong>.</Step>
              <Step n={2}>Choose your organization, give the project a name, set a strong database password, and select a region closest to your users.</Step>
              <Step n={3}>Once created, go to <strong>Project Settings → API</strong>. Copy:
                <ul className="list-disc ml-4 mt-1 space-y-0.5">
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
            </div>
          </GuideSection>

          {/* Meta / Facebook / Instagram */}
          <GuideSection title="📘 Meta — Facebook & Instagram">
            <div className="space-y-1 mt-3">
              <Step n={1}>Go to <Link href="https://developers.facebook.com/apps">developers.facebook.com/apps</Link> and click <strong>Create App</strong>.</Step>
              <Step n={2}>Select <strong>Other</strong> as the use case, then <strong>Business</strong> as the app type. Fill in the app name and contact email.</Step>
              <Step n={3}>In your new app dashboard, go to <strong>App Settings → Basic</strong>. Copy <strong>App ID</strong> and <strong>App Secret</strong>:
                <EnvBlock vars={[{ key: "META_APP_ID", value: "your_app_id" }, { key: "META_APP_SECRET", value: "your_app_secret" }]} />
              </Step>
              <Step n={4}>Add the <strong>Facebook Login</strong> product. In its Settings, add these to <strong>Valid OAuth Redirect URIs</strong>:
                <Uri label="Facebook OAuth callback" uri={`${appUrl}/api/social/callback/facebook`} />
                <Uri label="Instagram OAuth callback" uri={`${appUrl}/api/social/callback/instagram`} />
              </Step>
              <Step n={5}>Add the <strong>Instagram Graph API</strong> product for Instagram posting support.</Step>
              <Step n={6}>For production use, request these permissions via <strong>App Review</strong>:
                <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs text-slate-600">
                  <li><code>pages_manage_posts</code> — Publish to Facebook Pages</li>
                  <li><code>pages_read_engagement</code> — Read page analytics</li>
                  <li><code>instagram_content_publish</code> — Publish to Instagram</li>
                  <li><code>instagram_manage_insights</code> — Instagram analytics</li>
                </ul>
              </Step>
              <Step n={7}>Set app to <strong>Live mode</strong> (toggle in top bar) once App Review is approved.</Step>
            </div>
          </GuideSection>

          {/* LinkedIn */}
          <GuideSection title="💼 LinkedIn">
            <div className="space-y-1 mt-3">
              <Step n={1}>Go to <Link href="https://www.linkedin.com/developers/apps/new">linkedin.com/developers/apps/new</Link>.</Step>
              <Step n={2}>Fill in <strong>App name</strong>, select your <strong>LinkedIn Page</strong> (company page), upload a logo, and agree to terms. Click <strong>Create app</strong>.</Step>
              <Step n={3}>Go to the <strong>Auth</strong> tab. Copy <strong>Client ID</strong> and <strong>Client Secret</strong>:
                <EnvBlock vars={[{ key: "LINKEDIN_CLIENT_ID", value: "your_client_id" }, { key: "LINKEDIN_CLIENT_SECRET", value: "your_client_secret" }]} />
              </Step>
              <Step n={4}>In the Auth tab, under <strong>Authorized redirect URLs for your app</strong>, add:
                <Uri label="LinkedIn OAuth callback" uri={`${appUrl}/api/social/callback/linkedin`} />
              </Step>
              <Step n={5}>Go to the <strong>Products</strong> tab and request access to:
                <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs text-slate-600">
                  <li><strong>Share on LinkedIn</strong> — for posting content</li>
                  <li><strong>Sign In with LinkedIn using OpenID Connect</strong> — for auth</li>
                  <li><strong>Marketing Developer Platform</strong> — for company page posting (requires approval)</li>
                </ul>
              </Step>
              <Step n={6}>Required OAuth scopes: <code className="text-xs bg-slate-100 px-1 rounded">openid profile email w_member_social r_organization_social w_organization_social</code></Step>
            </div>
          </GuideSection>

          {/* Google / YouTube */}
          <GuideSection title="▶️ Google — YouTube">
            <div className="space-y-1 mt-3">
              <Step n={1}>Go to <Link href="https://console.cloud.google.com">console.cloud.google.com</Link>. Create a new project or select an existing one.</Step>
              <Step n={2}>Go to <strong>APIs & Services → Library</strong>. Search for and enable:
                <ul className="list-disc ml-4 mt-1 space-y-0.5 text-xs text-slate-600">
                  <li><strong>YouTube Data API v3</strong></li>
                </ul>
              </Step>
              <Step n={3}>Go to <strong>APIs & Services → OAuth consent screen</strong>. Choose <strong>External</strong>, fill in app name, support email, and developer contact. Add scope <code className="text-xs bg-slate-100 px-1 rounded">https://www.googleapis.com/auth/youtube.upload</code>.</Step>
              <Step n={4}>Go to <strong>APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID</strong>. Select <strong>Web application</strong>. Add the redirect URI:
                <Uri label="YouTube OAuth callback" uri={`${appUrl}/api/social/callback/youtube`} />
              </Step>
              <Step n={5}>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong>:
                <EnvBlock vars={[{ key: "GOOGLE_CLIENT_ID", value: "your_client_id.apps.googleusercontent.com" }, { key: "GOOGLE_CLIENT_SECRET", value: "your_client_secret" }]} />
              </Step>
              <Step n={6}>For production (non-test users), submit your app for <strong>Google verification</strong> via the OAuth consent screen page.</Step>
            </div>
          </GuideSection>

          {/* OpenAI */}
          <GuideSection title="🤖 OpenAI — AI Caption & Content Generation">
            <div className="space-y-1 mt-3">
              <Step n={1}>Go to <Link href="https://platform.openai.com">platform.openai.com</Link> and sign in or create an account.</Step>
              <Step n={2}>Click your profile (top-right) → <strong>API Keys</strong> → <strong>Create new secret key</strong>.</Step>
              <Step n={3}>Give it a name (e.g. "SocialPilot AI"), copy the key immediately — it won&apos;t be shown again:
                <EnvBlock vars={[{ key: "OPENAI_API_KEY", value: "sk-..." }, { key: "OPENAI_MODEL", value: "gpt-4o-mini" }]} />
              </Step>
              <Step n={4}>Set up billing at <Link href="https://platform.openai.com/billing">platform.openai.com/billing</Link>. Add a payment method and set usage limits to control costs.</Step>
              <Step n={5}>Recommended model: <code className="text-xs bg-slate-100 px-1 rounded">gpt-4o-mini</code> (fast and affordable). Use <code className="text-xs bg-slate-100 px-1 rounded">gpt-4o</code> for higher quality.</Step>
            </div>
          </GuideSection>

          {/* AWS S3 */}
          <GuideSection title="☁️ AWS S3 — Media File Storage">
            <div className="space-y-1 mt-3">
              <Step n={1}>Go to <Link href="https://aws.amazon.com/console">AWS Console</Link>. Create an account if needed.</Step>
              <Step n={2}>Go to <strong>IAM → Users → Create user</strong>. Name it <code className="text-xs bg-slate-100 px-1 rounded">socialpilot-ai</code>. In <strong>Permissions</strong>, attach the <code className="text-xs bg-slate-100 px-1 rounded">AmazonS3FullAccess</code> policy.</Step>
              <Step n={3}>After creating, go to the user → <strong>Security credentials → Create access key</strong> (Application running outside AWS). Copy:
                <EnvBlock vars={[{ key: "AWS_ACCESS_KEY_ID", value: "AKIA..." }, { key: "AWS_SECRET_ACCESS_KEY", value: "your_secret" }]} />
              </Step>
              <Step n={4}>Go to <strong>S3 → Create bucket</strong>. Choose a unique name and region. Uncheck <em>Block all public access</em> if you want direct public URLs (or use CloudFront instead):
                <EnvBlock vars={[{ key: "AWS_S3_BUCKET", value: "your-bucket-name" }, { key: "AWS_REGION", value: "us-east-1" }]} />
              </Step>
              <Step n={5}><strong>(Optional but recommended)</strong> Create a <strong>CloudFront distribution</strong> pointing to your S3 bucket for faster global delivery:
                <EnvBlock vars={[{ key: "AWS_CLOUDFRONT_URL", value: "https://d1234abcd.cloudfront.net" }]} />
              </Step>
              <Step n={6}>Add CORS to your S3 bucket (Permissions → CORS):
                <div className="bg-slate-900 rounded-lg p-3 my-2">
                  <pre className="text-xs text-slate-300 font-mono">{`[{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST","DELETE"],"AllowedOrigins":["${appUrl}"],"ExposeHeaders":[]}]`}</pre>
                </div>
              </Step>
            </div>
          </GuideSection>

          {/* Redis */}
          <GuideSection title="⚡ Redis — Background Job Queue (Upstash recommended)">
            <div className="space-y-1 mt-3">
              <Step n={1}>Go to <Link href="https://upstash.com">upstash.com</Link> and sign up (free tier available).</Step>
              <Step n={2}>Click <strong>Create Database</strong>. Choose <strong>Redis</strong>, give it a name, and select a region closest to your Vercel deployment.</Step>
              <Step n={3}>Once created, go to the database details page. Under <strong>Connect</strong>, copy the <strong>Redis URL</strong> (starts with <code className="text-xs bg-slate-100 px-1 rounded">rediss://</code>):
                <EnvBlock vars={[{ key: "REDIS_URL", value: "rediss://:password@hostname:port" }]} />
              </Step>
              <Step n={4}>Alternatively, use <strong>Vercel KV</strong> (powered by Upstash) directly from your Vercel project dashboard under <strong>Storage</strong>.</Step>
            </div>
          </GuideSection>

          {/* Security keys */}
          <GuideSection title="🔐 Generating Secure Secret Keys">
            <div className="space-y-1 mt-3">
              <Step n={1}>For <code className="text-xs bg-slate-100 px-1 rounded">APP_SECRET_KEY</code> and <code className="text-xs bg-slate-100 px-1 rounded">TOKEN_ENCRYPTION_KEY</code>, generate random 32-character strings.</Step>
              <Step n={2}>Use any of these methods:
                <div className="bg-slate-900 rounded-lg p-3 my-2 space-y-2">
                  <p className="text-xs text-slate-400 font-mono"># Node.js</p>
                  <pre className="text-xs text-slate-300 font-mono">node -e &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;</pre>
                  <p className="text-xs text-slate-400 font-mono mt-2"># OpenSSL</p>
                  <pre className="text-xs text-slate-300 font-mono">openssl rand -hex 32</pre>
                </div>
              </Step>
              <Step n={3}>Use a <strong>different value</strong> for each key. Never share or commit these to git.</Step>
            </div>
          </GuideSection>

        </div>
      )}
    </div>
  );
}
