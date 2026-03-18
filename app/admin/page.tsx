import { createServiceRoleClient } from "@/lib/supabase/server";
import { Users, Layers, CalendarClock, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";

export default async function AdminOverviewPage() {
  const db = createServiceRoleClient();

  const [
    usersResult,
    brandsResult,
    pendingResult,
    publishedTodayResult,
    publishedTotalResult,
    aiGenResult,
  ] = await Promise.all([
    db.from("users").select("id", { count: "exact", head: true }),
    db.from("brands").select("id", { count: "exact", head: true }),
    db.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("scheduled_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    db.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "published"),
    db.from("ai_generations").select("id", { count: "exact", head: true }),
  ]);

  // Recent users
  const { data: recentUsers } = await db
    .from("users")
    .select("id, email, full_name, plan, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  // Plan breakdown
  const { data: planRows } = await db.from("users").select("plan");
  const plans: Record<string, number> = {};
  (planRows || []).forEach((r: { plan: string }) => { plans[r.plan] = (plans[r.plan] || 0) + 1; });

  const stats = [
    { label: "Total Users", value: usersResult.count ?? 0, icon: Users, color: "bg-blue-500" },
    { label: "Total Brands", value: brandsResult.count ?? 0, icon: Layers, color: "bg-purple-500" },
    { label: "Scheduled (Pending)", value: pendingResult.count ?? 0, icon: CalendarClock, color: "bg-amber-500" },
    { label: "Published Today", value: publishedTodayResult.count ?? 0, icon: CheckCircle2, color: "bg-green-500" },
    { label: "Posts Published Total", value: publishedTotalResult.count ?? 0, icon: TrendingUp, color: "bg-teal-500" },
    { label: "AI Generations", value: aiGenResult.count ?? 0, icon: Sparkles, color: "bg-pink-500" },
  ];

  const PLAN_LABELS: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    agency: "Agency",
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Platform-wide statistics and activity.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Plan breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Users by Plan</h2>
          <div className="space-y-3">
            {["free", "starter", "pro", "agency"].map((plan) => {
              const count = plans[plan] || 0;
              const total = usersResult.count || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-600">{PLAN_LABELS[plan]}</span>
                    <span className="font-medium text-slate-800">{count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent signups */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Recent Signups</h2>
          <div className="space-y-2">
            {(recentUsers || []).length === 0 ? (
              <p className="text-sm text-slate-400">No users yet.</p>
            ) : (
              (recentUsers || []).map((u) => (
                <div key={u.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 flex-shrink-0">
                    {(u.full_name || u.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{u.full_name || "—"}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded capitalize">
                    {u.plan}
                  </span>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
