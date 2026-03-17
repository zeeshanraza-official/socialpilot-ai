"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { InboxMessage } from "@/types";

interface InboxFilter {
  brand_id?: string;
  status?: string;
  platform?: string;
  type?: string;
  page?: number;
}

async function fetchInbox(filter: InboxFilter = {}) {
  const params = new URLSearchParams();
  if (filter.brand_id) params.set("brand_id", filter.brand_id);
  if (filter.status) params.set("status", filter.status);
  if (filter.platform) params.set("platform", filter.platform);
  if (filter.type) params.set("type", filter.type);
  if (filter.page) params.set("page", filter.page.toString());

  const res = await fetch(`/api/inbox?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

async function updateMessageStatus(params: {
  message_ids: string[];
  status: string;
}) {
  const res = await fetch("/api/inbox", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error);
  }
}

async function sendReply(params: {
  message_id: string;
  content: string;
  was_ai_suggested?: boolean;
}) {
  const res = await fetch("/api/inbox/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

export function useInbox(filter: InboxFilter = {}) {
  return useQuery({
    queryKey: ["inbox", filter],
    queryFn: () => fetchInbox(filter),
    refetchInterval: 30_000, // Poll every 30 seconds
  });
}

export function useUpdateMessageStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMessageStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useSendReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendReply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}
