"use client";

import { useRouter } from "next/navigation";
import { PostComposer } from "@/components/composer/post-composer";
import type { Brand, CreateContentInput } from "@/types";
import toast from "react-hot-toast";

interface ComposePageClientProps {
  brands: Brand[];
  initialBrandId?: string;
}

export function ComposePageClient({ brands, initialBrandId }: ComposePageClientProps) {
  const router = useRouter();

  const handleSubmit = async (data: CreateContentInput) => {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to create post");

    router.push("/dashboard/calendar");
  };

  if (brands.length === 0) {
    return (
      <div className="p-6 text-center py-20">
        <h3 className="text-base font-medium text-surface-700 mb-2">No brands found</h3>
        <p className="text-sm text-surface-400 mb-4">
          Create a brand and connect social accounts before composing posts.
        </p>
        <a
          href="/dashboard/brands"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm rounded font-medium hover:bg-brand-700 transition-colors"
        >
          Go to Brands
        </a>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-surface-900">Compose Post</h2>
        <p className="text-sm text-surface-500 mt-0.5">
          Create and schedule content for your social accounts
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <PostComposer
          brands={brands}
          onSubmit={handleSubmit}
          initialBrandId={initialBrandId}
        />
      </div>
    </div>
  );
}
