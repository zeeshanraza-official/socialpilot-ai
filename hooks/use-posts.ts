"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ContentItem, CreateContentInput, PaginatedResponse } from "@/types";

interface PostsFilter {
  brand_id?: string;
  status?: string;
  platform?: string;
  page?: number;
  per_page?: number;
}

async function fetchPosts(
  filter: PostsFilter = {}
): Promise<PaginatedResponse<ContentItem>> {
  const params = new URLSearchParams();
  if (filter.brand_id) params.set("brand_id", filter.brand_id);
  if (filter.status) params.set("status", filter.status);
  if (filter.platform) params.set("platform", filter.platform);
  if (filter.page) params.set("page", filter.page.toString());
  if (filter.per_page) params.set("per_page", filter.per_page.toString());

  const res = await fetch(`/api/posts?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to fetch posts");
  return json.data;
}

async function createPost(data: CreateContentInput): Promise<ContentItem> {
  const res = await fetch("/api/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to create post");
  return json.data;
}

async function approvePost(params: {
  id: string;
  action: "approve" | "reject";
  rejection_reason?: string;
}): Promise<void> {
  const res = await fetch(`/api/posts/${params.id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: params.action,
      rejection_reason: params.rejection_reason,
    }),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || "Failed");
  }
}

export function usePosts(filter: PostsFilter = {}) {
  return useQuery({
    queryKey: ["posts", filter],
    queryFn: () => fetchPosts(filter),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useApprovePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approvePost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
