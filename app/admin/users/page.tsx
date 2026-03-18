import { createServiceRoleClient } from "@/lib/supabase/server";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const db = createServiceRoleClient();
  const page = parseInt(searchParams.page || "1");
  const limit = 25;
  const offset = (page - 1) * limit;
  const query = searchParams.q?.trim() || "";

  let dbQuery = db
    .from("users")
    .select("id, email, full_name, plan, onboarding_completed, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (query) {
    dbQuery = dbQuery.or(`email.ilike.%${query}%,full_name.ilike.%${query}%`);
  }

  const { data: users, count } = await dbQuery;

  // Brand counts
  const userIds = (users || []).map((u) => u.id);
  const { data: brandRows } = userIds.length
    ? await db.from("brands").select("user_id").in("user_id", userIds)
    : { data: [] };

  const brandMap: Record<string, number> = {};
  (brandRows || []).forEach((b) => { brandMap[b.user_id] = (brandMap[b.user_id] || 0) + 1; });

  const enriched = (users || []).map((u) => ({
    ...u,
    brand_count: brandMap[u.id] || 0,
  }));

  return (
    <UsersClient
      users={enriched}
      total={count ?? 0}
      page={page}
      limit={limit}
      query={query}
    />
  );
}
