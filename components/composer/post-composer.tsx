"use client";

import { useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sparkles, Send, Clock, Save, Image as ImageIcon,
  Link as LinkIcon, X, ChevronDown, Loader2, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, PLATFORM_CONFIG, buildCaptionWithHashtags } from "@/lib/utils";
import { createContentSchema } from "@/lib/security/validate";
import type { Brand, SocialAccount, Platform, CreateContentInput } from "@/types";
import { PlatformPreview } from "./platform-preview";
import { AiAssistant } from "./ai-assistant";
import toast from "react-hot-toast";
import { z } from "zod";

interface PostComposerProps {
  brands: Brand[];
  onSubmit: (data: CreateContentInput) => Promise<void>;
  initialBrandId?: string;
}

type FormData = z.infer<typeof createContentSchema>;

const PLATFORM_ORDER: Platform[] = ["facebook", "instagram", "linkedin", "youtube"];

export function PostComposer({ brands, onSubmit, initialBrandId }: PostComposerProps) {
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(
    brands.find((b) => b.id === initialBrandId) || brands[0] || null
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["facebook"]);
  const [previewPlatform, setPreviewPlatform] = useState<Platform>("facebook");
  const [showPreview, setShowPreview] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [mediaFiles, setMediaFiles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<"draft" | "schedule">("draft");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      brand_id: initialBrandId || brands[0]?.id || "",
      target_platforms: ["facebook"],
      target_account_ids: [],
      caption: "",
      hashtags: [],
    },
  });

  const caption = watch("caption") || "";
  const activePlatformConfig = PLATFORM_CONFIG[previewPlatform];

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
    setValue(
      "target_platforms",
      selectedPlatforms.includes(platform)
        ? selectedPlatforms.filter((p) => p !== platform)
        : [...selectedPlatforms, platform]
    );
  };

  const addHashtag = () => {
    const tag = hashtagInput.replace(/^#/, "").trim();
    if (tag && !hashtags.includes(tag)) {
      const newTags = [...hashtags, tag];
      setHashtags(newTags);
      setValue("hashtags", newTags);
      setHashtagInput("");
    }
  };

  const removeHashtag = (tag: string) => {
    const newTags = hashtags.filter((h) => h !== tag);
    setHashtags(newTags);
    setValue("hashtags", newTags);
  };

  const onAiCaption = (text: string, aiHashtags: string[]) => {
    setValue("caption", text);
    if (aiHashtags.length > 0) {
      const merged = [...new Set([...hashtags, ...aiHashtags])];
      setHashtags(merged);
      setValue("hashtags", merged);
    }
  };

  const onFormSubmit = async (data: FormData) => {
    if (selectedPlatforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    if (!selectedBrand) {
      toast.error("Select a brand");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        target_platforms: selectedPlatforms,
        hashtags,
      } as CreateContentInput);
      toast.success(
        submitAction === "draft" ? "Draft saved!" : "Post scheduled!"
      );
    } catch (error) {
      toast.error((error as Error).message || "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex gap-5 h-full">
      {/* Composer Panel */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Brand + Platform Select */}
        <div className="bg-white border border-surface-200 rounded-lg p-4">
          {/* Brand Select */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-surface-600 mb-2">Brand</label>
            <div className="flex flex-wrap gap-2">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => {
                    setSelectedBrand(brand);
                    setValue("brand_id", brand.id);
                  }}
                  className={cn(
                    "flex items-center gap-2 h-8 px-3 rounded border text-sm font-medium transition-colors",
                    selectedBrand?.id === brand.id
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-surface-200 text-surface-600 hover:border-surface-300"
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: brand.color }}
                  />
                  {brand.name}
                </button>
              ))}
            </div>
          </div>

          {/* Platform Select */}
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-2">
              Platforms
            </label>
            <div className="flex gap-2">
              {PLATFORM_ORDER.map((platform) => {
                const config = PLATFORM_CONFIG[platform];
                const active = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className={cn(
                      "flex items-center gap-1.5 h-8 px-3 rounded border text-xs font-medium transition-colors",
                      active
                        ? "text-white border-transparent"
                        : "border-surface-200 text-surface-500 hover:border-surface-300 bg-white"
                    )}
                    style={active ? { backgroundColor: config.color } : {}}
                    title={config.label}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Caption Editor */}
        <div className="bg-white border border-surface-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-surface-600">Caption</label>
            <button
              type="button"
              onClick={() => setShowAi(!showAi)}
              className={cn(
                "flex items-center gap-1.5 h-7 px-2.5 rounded border text-xs font-medium transition-colors",
                showAi
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-surface-200 text-surface-600 hover:bg-surface-50"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Write
            </button>
          </div>

          <Controller
            name="caption"
            control={control}
            render={({ field }) => (
              <Textarea
                {...field}
                placeholder={`Write your caption for ${selectedPlatforms.join(", ")}...`}
                rows={6}
                charLimit={activePlatformConfig?.maxCaption}
                currentLength={caption.length}
                error={errors.caption?.message}
              />
            )}
          />

          {/* AI Assistant */}
          {showAi && selectedBrand && (
            <div className="mt-3">
              <AiAssistant
                brand={selectedBrand}
                platform={previewPlatform}
                currentCaption={caption}
                onApply={onAiCaption}
              />
            </div>
          )}
        </div>

        {/* Hashtags */}
        <div className="bg-white border border-surface-200 rounded-lg p-4">
          <label className="block text-xs font-medium text-surface-600 mb-2">Hashtags</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  addHashtag();
                }
              }}
              placeholder="Add hashtag (press Enter)"
              className="flex-1 h-8 px-3 rounded border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <Button size="sm" variant="secondary" onClick={addHashtag} type="button">
              Add
            </Button>
          </div>

          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 text-brand-700 text-xs rounded border border-brand-200"
                >
                  #{tag}
                  <button onClick={() => removeHashtag(tag)} className="hover:text-brand-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            leftIcon={<Save className="w-4 h-4" />}
            loading={isSubmitting && submitAction === "draft"}
            onClick={() => {
              setSubmitAction("draft");
              handleSubmit(onFormSubmit)();
            }}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            variant="primary"
            leftIcon={<Clock className="w-4 h-4" />}
            loading={isSubmitting && submitAction === "schedule"}
            onClick={() => {
              setSubmitAction("schedule");
              handleSubmit(onFormSubmit)();
            }}
          >
            Schedule Post
          </Button>
          <Button
            type="button"
            variant="ghost"
            leftIcon={<Eye className="w-4 h-4" />}
            onClick={() => setShowPreview(!showPreview)}
          >
            Preview
          </Button>
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="w-80 flex-shrink-0">
          <div className="bg-white border border-surface-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-xs font-medium text-surface-600">Preview as:</p>
              <div className="flex gap-1">
                {selectedPlatforms.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPreviewPlatform(p)}
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      previewPlatform === p
                        ? "bg-brand-600 text-white"
                        : "text-surface-600 hover:bg-surface-100"
                    )}
                  >
                    {PLATFORM_CONFIG[p].label}
                  </button>
                ))}
              </div>
            </div>
            <PlatformPreview
              platform={previewPlatform}
              caption={buildCaptionWithHashtags(caption, hashtags)}
              mediaUrls={mediaFiles}
              brandName={selectedBrand?.name}
            />
          </div>
        </div>
      )}
    </div>
  );
}
