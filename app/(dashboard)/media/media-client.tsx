"use client";

import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload, Trash2, Image as ImageIcon, Video, Sparkles,
  Grid, List, Search, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { cn, formatFileSize, formatRelativeDate } from "@/lib/utils";
import type { MediaAsset } from "@/types";
import toast from "react-hot-toast";

interface Brand {
  id: string;
  name: string;
  color: string;
}

interface MediaPageClientProps {
  brands: Brand[];
  initialBrandId?: string;
}

export function MediaPageClient({ brands, initialBrandId }: MediaPageClientProps) {
  const [selectedBrand, setSelectedBrand] = useState(initialBrandId || brands[0]?.id || "");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [aiGenOpen, setAiGenOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadAssets = async () => {
    if (!selectedBrand) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        brand_id: selectedBrand,
        per_page: "30",
      });
      if (fileTypeFilter !== "all") params.set("file_type", fileTypeFilter);

      const res = await fetch(`/api/media?${params}`);
      const json = await res.json();
      if (res.ok) {
        setAssets(json.data.data || []);
        setTotal(json.data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [selectedBrand, fileTypeFilter]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!selectedBrand) {
        toast.error("Select a brand first");
        return;
      }

      setUploading(true);
      let successCount = 0;

      for (const file of acceptedFiles) {
        try {
          // Get upload URL
          const uploadRes = await fetch("/api/media/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              brand_id: selectedBrand,
              filename: file.name,
              mime_type: file.type,
              file_size_bytes: file.size,
            }),
          });

          const uploadJson = await uploadRes.json();
          if (!uploadRes.ok) throw new Error(uploadJson.error);

          const { upload_url, asset_id } = uploadJson.data;

          // Upload to S3
          const s3Res = await fetch(upload_url, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });

          if (!s3Res.ok) throw new Error("S3 upload failed");

          successCount++;
        } catch (error) {
          toast.error(`Failed to upload ${file.name}: ${(error as Error).message}`);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded!`);
        loadAssets();
      }
      setUploading(false);
    },
    [selectedBrand]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"],
      "video/*": [".mp4", ".mov"],
    },
    maxSize: 512 * 1024 * 1024, // 512MB
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/media?asset_id=${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      setAssets((prev) => prev.filter((a) => a.id !== deleteId));
      toast.success("Asset deleted");
    } else {
      toast.error("Failed to delete");
    }
    setDeleteId(null);
  };

  const handleGenerateImage = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Enter a prompt first");
      return;
    }
    setGeneratingImage(true);
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: selectedBrand,
          prompt: aiPrompt,
          size: "1024x1024",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success("Image generated and saved to library!");
      setAiGenOpen(false);
      setAiPrompt("");
      loadAssets();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-surface-900">Media Library</h2>
          <p className="text-sm text-surface-500 mt-0.5">
            {total} assets stored
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={() => setAiGenOpen(true)}
          >
            AI Generate
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="h-9 px-3 rounded border border-surface-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <div className="flex gap-0.5 bg-surface-100 rounded p-0.5">
          {["all", "image", "video", "gif"].map((type) => (
            <button
              key={type}
              onClick={() => setFileTypeFilter(type)}
              className={cn(
                "px-3 h-7 rounded text-xs font-medium transition-colors capitalize",
                fileTypeFilter === type
                  ? "bg-white text-surface-900 shadow-surface-sm"
                  : "text-surface-500"
              )}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setViewMode("grid")}
            className={cn("w-8 h-8 flex items-center justify-center rounded transition-colors", viewMode === "grid" ? "bg-surface-200" : "hover:bg-surface-100")}
          >
            <Grid className="w-4 h-4 text-surface-600" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn("w-8 h-8 flex items-center justify-center rounded transition-colors", viewMode === "list" ? "bg-surface-200" : "hover:bg-surface-100")}
          >
            <List className="w-4 h-4 text-surface-600" />
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-brand-400 bg-brand-50"
            : "border-surface-200 hover:border-surface-300 bg-surface-50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 text-surface-300 mx-auto mb-2" />
        <p className="text-sm text-surface-600">
          {isDragActive ? "Drop files here" : "Drag & drop files here, or click to browse"}
        </p>
        <p className="text-xs text-surface-400 mt-1">
          Images (JPG, PNG, GIF, WebP) and Videos (MP4, MOV) up to 512MB
        </p>
        {uploading && (
          <p className="text-xs text-brand-600 mt-2 animate-pulse">Uploading...</p>
        )}
      </div>

      {/* Assets Grid / List */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-surface-200 rounded animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16">
          <ImageIcon className="w-12 h-12 text-surface-200 mx-auto mb-3" />
          <p className="text-sm text-surface-400">No media assets yet</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {assets.map((asset) => (
            <div key={asset.id} className="group relative aspect-square">
              <div className="w-full h-full bg-surface-100 rounded-lg overflow-hidden">
                {asset.file_type === "video" ? (
                  <div className="w-full h-full flex items-center justify-center bg-surface-900">
                    <Video className="w-8 h-8 text-surface-400" />
                  </div>
                ) : (
                  <img
                    src={asset.cdn_url || asset.thumbnail_cdn_url || ""}
                    alt={asset.alt_text || asset.original_filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-surface-900/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setDeleteId(asset.id)}
                  className="w-8 h-8 bg-danger-500 rounded flex items-center justify-center text-white hover:bg-danger-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* AI badge */}
              {asset.ai_generated && (
                <div className="absolute top-1.5 left-1.5">
                  <Badge variant="brand" size="sm">
                    <Sparkles className="w-2.5 h-2.5 mr-0.5" />AI
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-surface-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-surface-500">File</th>
                <th className="px-4 py-3 text-xs font-medium text-surface-500">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-surface-500">Size</th>
                <th className="px-4 py-3 text-xs font-medium text-surface-500">Added</th>
                <th className="px-4 py-3 text-xs font-medium text-surface-500" />
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id} className="border-b border-surface-100 hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-surface-100 rounded overflow-hidden flex-shrink-0">
                        {asset.file_type === "image" || asset.file_type === "gif" ? (
                          <img
                            src={asset.cdn_url || ""}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Video className="w-full h-full p-1.5 text-surface-400" />
                        )}
                      </div>
                      <span className="text-xs text-surface-700 truncate max-w-[200px]">
                        {asset.original_filename}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default" size="sm">{asset.file_type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-surface-500">
                    {formatFileSize(asset.file_size_bytes)}
                  </td>
                  <td className="px-4 py-3 text-xs text-surface-500">
                    {formatRelativeDate(asset.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDeleteId(asset.id)}
                      className="text-surface-400 hover:text-danger-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Image Generation Modal */}
      <Modal
        open={aiGenOpen}
        onClose={() => setAiGenOpen(false)}
        title="AI Image Generation"
        description="Generate a custom image for your brand using AI"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAiGenOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateImage}
              loading={generatingImage}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Generate
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Image Prompt
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe the image you want to generate... e.g. 'Professional product photo on white background with soft lighting'"
              rows={4}
              className="w-full rounded border border-surface-300 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <p className="text-xs text-surface-400">
            The AI will generate a 1024x1024 image based on your prompt and brand context.
            The image will be automatically saved to your media library.
          </p>
        </div>
      </Modal>

      {/* Delete Confirm */}
      {deleteId && (
        <Modal
          open={!!deleteId}
          onClose={() => setDeleteId(null)}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete}>Delete</Button>
            </>
          }
        >
          <div className="text-center py-2">
            <h3 className="text-base font-semibold text-surface-900">Delete Asset?</h3>
            <p className="text-sm text-surface-500 mt-2">
              This will permanently delete the file. This cannot be undone.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
