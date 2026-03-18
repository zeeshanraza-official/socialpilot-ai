"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, X, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { createBrandSchema } from "@/lib/security/validate";
import { slugify } from "@/lib/utils";
import type { Brand, BrandTone } from "@/types";
import toast from "react-hot-toast";

type FormData = z.infer<typeof createBrandSchema>;

const TONES: { value: BrandTone; label: string; desc: string }[] = [
  { value: "professional", label: "Professional", desc: "Formal, business-oriented" },
  { value: "casual", label: "Casual", desc: "Relaxed, conversational" },
  { value: "friendly", label: "Friendly", desc: "Warm, approachable" },
  { value: "authoritative", label: "Authoritative", desc: "Expert, confident" },
  { value: "humorous", label: "Humorous", desc: "Fun, light-hearted" },
  { value: "inspirational", label: "Inspirational", desc: "Motivating, uplifting" },
];

const BRAND_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f97316",
  "#22c55e", "#14b8a6", "#ef4444", "#f59e0b",
];

export function BrandSettingsClient({ brand }: { brand: Brand }) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hashtagInput, setHashtagInput] = useState("");
  const [bannedInput, setBannedInput] = useState("");
  const hashtagRef = useRef<HTMLInputElement>(null);
  const bannedRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(createBrandSchema),
    defaultValues: {
      name: brand.name,
      slug: brand.slug,
      description: brand.description ?? "",
      website: brand.website ?? "",
      industry: brand.industry ?? "",
      tone: brand.tone,
      voice_description: brand.voice_description ?? "",
      color: brand.color,
      default_hashtags: brand.default_hashtags ?? [],
      banned_words: brand.banned_words ?? [],
      cta_style: brand.cta_style ?? "",
    },
  });

  const selectedColor = watch("color");
  const selectedTone = watch("tone");
  const hashtags = watch("default_hashtags") ?? [];
  const bannedWords = watch("banned_words") ?? [];

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue("slug", slugify(e.target.value), { shouldDirty: true });
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !hashtags.includes(tag)) {
      setValue("default_hashtags", [...hashtags, tag], { shouldDirty: true });
    }
    setHashtagInput("");
    hashtagRef.current?.focus();
  };

  const removeHashtag = (tag: string) => {
    setValue("default_hashtags", hashtags.filter((t) => t !== tag), { shouldDirty: true });
  };

  const addBannedWord = () => {
    const word = bannedInput.trim().toLowerCase();
    if (word && !bannedWords.includes(word)) {
      setValue("banned_words", [...bannedWords, word], { shouldDirty: true });
    }
    setBannedInput("");
    bannedRef.current?.focus();
  };

  const removeBannedWord = (word: string) => {
    setValue("banned_words", bannedWords.filter((w) => w !== word), { shouldDirty: true });
  };

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save changes");
      toast.success("Brand settings saved");
      router.push(`/dashboard/brands/${brand.id}`);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/brands/${brand.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete brand");
      toast.success("Brand deleted");
      router.push("/dashboard/brands");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/brands/${brand.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to {brand.name}
        </Link>
        <h2 className="text-xl font-semibold text-surface-900">Brand Settings</h2>
        <p className="text-sm text-surface-500 mt-0.5">Update your brand profile and preferences.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name + Slug */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Brand Name"
            required
            placeholder="Acme Corp"
            error={errors.name?.message}
            {...register("name", { onChange: handleNameChange })}
          />
          <Input
            label="Slug (URL)"
            required
            placeholder="acme-corp"
            hint="Lowercase letters, numbers, hyphens only."
            error={errors.slug?.message}
            {...register("slug")}
          />
        </div>

        <Textarea
          label="Description"
          placeholder="What does this brand do?"
          rows={2}
          error={errors.description?.message}
          {...register("description")}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Website"
            type="url"
            placeholder="https://acme.com"
            error={errors.website?.message}
            {...register("website")}
          />
          <Input
            label="Industry"
            placeholder="Technology, Retail, etc."
            {...register("industry")}
          />
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Brand Color</label>
          <div className="flex gap-2 flex-wrap">
            {BRAND_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setValue("color", color, { shouldDirty: true })}
                className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: selectedColor === color ? "#1e293b" : "transparent",
                }}
              />
            ))}
          </div>
        </div>

        {/* Tone */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Brand Tone <span className="text-danger-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TONES.map((tone) => (
              <button
                key={tone.value}
                type="button"
                onClick={() => setValue("tone", tone.value, { shouldDirty: true })}
                className={`p-2.5 rounded border text-left transition-colors ${
                  selectedTone === tone.value
                    ? "border-brand-500 bg-brand-50"
                    : "border-surface-200 hover:border-surface-300"
                }`}
              >
                <p className="text-xs font-medium text-surface-800">{tone.label}</p>
                <p className="text-xs text-surface-400 mt-0.5">{tone.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="Voice Description"
          placeholder="Describe your brand's voice and communication style..."
          rows={3}
          {...register("voice_description")}
        />

        <Input
          label="CTA Style"
          placeholder="e.g. 'Shop now', 'Learn more', 'Get started'"
          {...register("cta_style")}
        />

        {/* Default Hashtags */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Default Hashtags</label>
          <div className="flex gap-2 mb-2">
            <input
              ref={hashtagRef}
              value={hashtagInput}
              onChange={(e) => setHashtagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHashtag(); } }}
              placeholder="#marketing"
              className="flex-1 rounded border border-surface-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addHashtag} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Add
            </Button>
          </div>
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {hashtags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded">
                  #{tag}
                  <button type="button" onClick={() => removeHashtag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Banned Words */}
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">Banned Words</label>
          <div className="flex gap-2 mb-2">
            <input
              ref={bannedRef}
              value={bannedInput}
              onChange={(e) => setBannedInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBannedWord(); } }}
              placeholder="competitor, spam..."
              className="flex-1 rounded border border-surface-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addBannedWord} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Add
            </Button>
          </div>
          {bannedWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {bannedWords.map((word) => (
                <span key={word} className="inline-flex items-center gap-1 text-xs bg-danger-50 text-danger-700 px-2 py-1 rounded">
                  {word}
                  <button type="button" onClick={() => removeBannedWord(word)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-surface-100">
          <Link href={`/dashboard/brands/${brand.id}`}>
            <Button type="button" variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Save Changes
          </Button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="border border-danger-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-surface-900">Delete Brand</h3>
            <p className="text-xs text-surface-500 mt-0.5">
              Permanently delete this brand and all its data. This cannot be undone.
            </p>
            {showDeleteConfirm ? (
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  loading={isDeleting}
                  onClick={handleDelete}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Yes, delete &ldquo;{brand.name}&rdquo;
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="danger"
                size="sm"
                className="mt-3"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Brand
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
