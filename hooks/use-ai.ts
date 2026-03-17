"use client";

import { useMutation } from "@tanstack/react-query";
import type { Platform, BrandTone } from "@/types";

interface GenerateCaptionParams {
  brand_id: string;
  topic: string;
  platform: Platform;
  tone?: BrandTone;
  keywords?: string[];
  target_audience?: string;
  include_cta?: boolean;
}

interface GenerateCaptionResult {
  caption: string;
  hashtags: string[];
  first_comment: string;
  generation_id?: string;
}

async function generateCaption(
  params: GenerateCaptionParams
): Promise<GenerateCaptionResult> {
  const res = await fetch("/api/ai/caption", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Generation failed");
  return json.data;
}

async function generateVariations(params: {
  brand_id: string;
  caption: string;
  platform: Platform;
  count?: number;
}): Promise<string[]> {
  const res = await fetch("/api/ai/variations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed");
  return json.data.variations;
}

async function generateImage(params: {
  brand_id: string;
  prompt: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
}): Promise<{ cdn_url: string; revised_prompt: string; media_asset: unknown }> {
  const res = await fetch("/api/ai/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Image generation failed");
  return json.data;
}

export function useGenerateCaption() {
  return useMutation({ mutationFn: generateCaption });
}

export function useGenerateVariations() {
  return useMutation({ mutationFn: generateVariations });
}

export function useGenerateImage() {
  return useMutation({ mutationFn: generateImage });
}
