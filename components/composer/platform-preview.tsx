"use client";

import { Image, Heart, MessageCircle, Share2, Bookmark, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Platform } from "@/types";

interface PlatformPreviewProps {
  platform: Platform;
  caption: string;
  mediaUrls?: string[];
  brandName?: string;
  brandLogo?: string;
}

export function PlatformPreview({
  platform,
  caption,
  mediaUrls = [],
  brandName = "Your Brand",
  brandLogo,
}: PlatformPreviewProps) {
  switch (platform) {
    case "facebook":
      return <FacebookPreview caption={caption} mediaUrls={mediaUrls} brandName={brandName} />;
    case "instagram":
      return <InstagramPreview caption={caption} mediaUrls={mediaUrls} brandName={brandName} />;
    case "linkedin":
      return <LinkedInPreview caption={caption} mediaUrls={mediaUrls} brandName={brandName} />;
    case "youtube":
      return <YouTubePreview caption={caption} mediaUrls={mediaUrls} brandName={brandName} />;
    default:
      return null;
  }
}

function PostAvatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
}

function MediaPlaceholder({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return (
      <div className="aspect-square bg-surface-100 rounded flex items-center justify-center text-surface-300">
        <Image className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className={cn("grid gap-0.5", urls.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
      {urls.slice(0, 4).map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          className="aspect-square object-cover w-full"
        />
      ))}
    </div>
  );
}

function FacebookPreview({ caption, mediaUrls, brandName }: {
  caption: string;
  mediaUrls: string[];
  brandName: string;
}) {
  return (
    <div className="bg-white rounded border border-surface-200 text-xs font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <PostAvatar name={brandName} />
        <div>
          <p className="font-semibold text-surface-900 text-xs">{brandName}</p>
          <p className="text-surface-400 text-2xs">Just now · Public</p>
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <div className="px-3 pb-2">
          <p className="text-surface-800 text-xs whitespace-pre-line leading-relaxed">
            {caption.substring(0, 300)}{caption.length > 300 ? "..." : ""}
          </p>
        </div>
      )}

      {/* Media */}
      <div className="border-y border-surface-100">
        <MediaPlaceholder urls={mediaUrls} />
      </div>

      {/* Reactions */}
      <div className="px-3 py-2 flex items-center gap-4 text-surface-500">
        <button className="flex items-center gap-1 hover:text-brand-600">
          <ThumbsUp className="w-3.5 h-3.5" /> Like
        </button>
        <button className="flex items-center gap-1 hover:text-brand-600">
          <MessageCircle className="w-3.5 h-3.5" /> Comment
        </button>
        <button className="flex items-center gap-1 hover:text-brand-600">
          <Share2 className="w-3.5 h-3.5" /> Share
        </button>
      </div>
    </div>
  );
}

function InstagramPreview({ caption, mediaUrls, brandName }: {
  caption: string;
  mediaUrls: string[];
  brandName: string;
}) {
  return (
    <div className="bg-white rounded border border-surface-200 text-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-pink-500 p-0.5">
            <PostAvatar name={brandName} />
          </div>
          <span className="font-semibold text-surface-900 text-xs">{brandName}</span>
        </div>
        <span className="text-surface-400 text-lg leading-none">···</span>
      </div>

      {/* Media */}
      <MediaPlaceholder urls={mediaUrls} />

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 text-surface-800">
            <Heart className="w-5 h-5" />
            <MessageCircle className="w-5 h-5" />
            <Share2 className="w-5 h-5" />
          </div>
          <Bookmark className="w-5 h-5 text-surface-800" />
        </div>

        {caption && (
          <p className="text-surface-800 text-xs leading-relaxed">
            <span className="font-semibold mr-1">{brandName}</span>
            {caption.substring(0, 200)}{caption.length > 200 ? "..." : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function LinkedInPreview({ caption, mediaUrls, brandName }: {
  caption: string;
  mediaUrls: string[];
  brandName: string;
}) {
  return (
    <div className="bg-white rounded border border-surface-200 text-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-start gap-2 p-3">
        <PostAvatar name={brandName} />
        <div>
          <p className="font-semibold text-surface-900 text-xs">{brandName}</p>
          <p className="text-surface-400 text-2xs">Just now · 🌍</p>
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <div className="px-3 pb-2">
          <p className="text-surface-800 text-xs whitespace-pre-line leading-relaxed">
            {caption.substring(0, 400)}{caption.length > 400 ? "..." : ""}
          </p>
        </div>
      )}

      {/* Media */}
      {mediaUrls.length > 0 && (
        <div className="border-y border-surface-100">
          <MediaPlaceholder urls={mediaUrls} />
        </div>
      )}

      {/* Reactions */}
      <div className="px-3 py-2 flex items-center gap-4 text-surface-500">
        <button className="flex items-center gap-1">
          <ThumbsUp className="w-3.5 h-3.5" /> Like
        </button>
        <button className="flex items-center gap-1">
          <MessageCircle className="w-3.5 h-3.5" /> Comment
        </button>
        <button className="flex items-center gap-1">
          <Share2 className="w-3.5 h-3.5" /> Repost
        </button>
        <button className="flex items-center gap-1">Send</button>
      </div>
    </div>
  );
}

function YouTubePreview({ caption, mediaUrls, brandName }: {
  caption: string;
  mediaUrls: string[];
  brandName: string;
}) {
  return (
    <div className="bg-white rounded border border-surface-200 text-xs overflow-hidden">
      {/* Thumbnail */}
      <div className="aspect-video bg-surface-900 flex items-center justify-center relative">
        {mediaUrls[0] ? (
          <img src={mediaUrls[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="text-surface-400 flex flex-col items-center gap-1">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
              <div className="w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-8 border-l-white ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        {caption && (
          <p className="font-semibold text-surface-900 text-xs leading-tight mb-2">
            {caption.substring(0, 100)}{caption.length > 100 ? "..." : ""}
          </p>
        )}
        <div className="flex items-center gap-1.5">
          <PostAvatar name={brandName} />
          <div>
            <p className="font-medium text-surface-600 text-2xs">{brandName}</p>
            <p className="text-surface-400 text-2xs">0 views · Just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}
