"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createBrandSchema } from "@/lib/security/validate";
import { slugify } from "@/lib/utils";
import { z } from "zod";
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

interface CreateBrandFormProps {
  onSuccess: (brand: Brand) => void;
  onCancel: () => void;
}

export function CreateBrandForm({ onSuccess, onCancel }: CreateBrandFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createBrandSchema),
    defaultValues: {
      tone: "professional",
      color: "#3b82f6",
    },
  });

  const name = watch("name");
  const selectedColor = watch("color");
  const selectedTone = watch("tone");

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue("slug", slugify(value));
  };

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create brand");

      onSuccess(json.data as Brand);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name + Slug */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Brand Name"
          required
          placeholder="Acme Corp"
          error={errors.name?.message}
          {...register("name", {
            onChange: handleNameChange,
          })}
        />
        <Input
          label="Slug (URL)"
          required
          placeholder="acme-corp"
          error={errors.slug?.message}
          hint="Used in URLs. Lowercase letters, numbers, hyphens only."
          {...register("slug")}
        />
      </div>

      <Input
        label="Website"
        type="url"
        placeholder="https://acme.com"
        error={errors.website?.message}
        {...register("website")}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Industry"
          placeholder="Technology, Retail, etc."
          {...register("industry")}
        />
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-1.5">
            Brand Color
          </label>
          <div className="flex gap-2 flex-wrap">
            {BRAND_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setValue("color", color)}
                className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: selectedColor === color ? "#1e293b" : "transparent",
                }}
              />
            ))}
          </div>
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
              onClick={() => setValue("tone", tone.value)}
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

      <div>
        <label className="block text-sm font-medium text-surface-700 mb-1">
          Voice Description
        </label>
        <textarea
          placeholder="Describe your brand's voice and communication style..."
          rows={3}
          className="w-full rounded border border-surface-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
          {...register("voice_description")}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1" loading={isSubmitting}>
          Create Brand
        </Button>
      </div>
    </form>
  );
}
