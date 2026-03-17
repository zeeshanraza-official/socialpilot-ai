"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Brand, CreateBrandInput } from "@/types";

async function fetchBrands(): Promise<Brand[]> {
  const res = await fetch("/api/brands");
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to fetch brands");
  return json.data;
}

async function createBrand(data: CreateBrandInput): Promise<Brand> {
  const res = await fetch("/api/brands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to create brand");
  return json.data;
}

async function deleteBrand(id: string): Promise<void> {
  const res = await fetch(`/api/brands/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error || "Failed to delete brand");
  }
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: fetchBrands,
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBrand,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
  });
}
