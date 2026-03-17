"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrandCard } from "@/components/brands/brand-card";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/modal";
import { CreateBrandForm } from "./create-brand-form";
import type { Brand } from "@/types";
import toast from "react-hot-toast";

interface BrandsPageClientProps {
  brands: Brand[];
}

export function BrandsPageClient({ brands: initialBrands }: BrandsPageClientProps) {
  const router = useRouter();
  const [brands, setBrands] = useState(initialBrands);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = brands.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.slug.toLowerCase().includes(search.toLowerCase())
  );

  const handleBrandCreated = (brand: Brand) => {
    setBrands((prev) => [brand, ...prev]);
    setCreateOpen(false);
    toast.success(`Brand "${brand.name}" created!`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/brands/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      setBrands((prev) => prev.filter((b) => b.id !== deleteId));
      toast.success("Brand deleted");
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete brand");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-surface-900">Brands</h2>
          <p className="text-sm text-surface-500 mt-0.5">
            Manage your social media brands (streams)
          </p>
        </div>
        <Button
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setCreateOpen(true)}
        >
          New Brand
        </Button>
      </div>

      {/* Search */}
      {brands.length > 0 && (
        <div className="mb-5 w-72">
          <Input
            placeholder="Search brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftAddon={<Search className="w-4 h-4" />}
          />
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-7 h-7 text-surface-300" />
          </div>
          <h3 className="text-base font-medium text-surface-700 mb-2">
            {brands.length === 0 ? "No brands yet" : "No brands match your search"}
          </h3>
          <p className="text-sm text-surface-400 mb-5">
            {brands.length === 0
              ? "Create your first brand to start managing social media accounts"
              : "Try a different search term"}
          </p>
          {brands.length === 0 && (
            <Button onClick={() => setCreateOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Create Your First Brand
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((brand) => (
            <BrandCard
              key={brand.id}
              brand={brand}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      {/* Create Brand Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create New Brand"
        description="Brands are separate workspaces for different social media presences"
        size="lg"
      >
        <CreateBrandForm
          onSuccess={handleBrandCreated}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Brand?"
        description="This will permanently delete the brand and all its content, scheduled posts, and media. This cannot be undone."
        confirmLabel="Delete Brand"
        cancelLabel="Cancel"
        danger
        loading={deleting}
      />
    </div>
  );
}
