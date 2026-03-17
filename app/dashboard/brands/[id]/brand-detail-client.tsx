"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Facebook, Instagram, Linkedin, Youtube,
  Plus, PenSquare, BarChart2, CheckCircle, Clock, FileText,
  RefreshCw, X, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, getInitials, PLATFORM_CONFIG } from "@/lib/utils";
import type { Brand, SocialAccount, Platform } from "@/types";
import toast from "react-hot-toast";

const PLATFORM_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
};

interface BrandDetailClientProps {
  brand: Brand;
  contentStats: {
    total: number;
    published: number;
    scheduled: number;
    drafts: number;
  };
  connectionSuccess?: string;
}

export function BrandDetailClient({
  brand,
  contentStats,
  connectionSuccess,
}: BrandDetailClientProps) {
  const [connectingPlatform, setConnectingPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    if (connectionSuccess) {
      toast.success(`${connectionSuccess} account connected!`);
    }
  }, [connectionSuccess]);

  const handleConnect = async (platform: Platform) => {
    setConnectingPlatform(platform);
    try {
      const res = await fetch(
        `/api/social/connect/${platform}?brand_id=${brand.id}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      // Redirect to OAuth
      window.location.href = json.data.auth_url;
    } catch (error) {
      toast.error((error as Error).message);
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    const res = await fetch(`/api/social/connect/${brand.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_id: accountId }),
    });

    if (res.ok) {
      toast.success("Account disconnected");
      window.location.reload();
    } else {
      toast.error("Failed to disconnect");
    }
  };

  const connectedAccounts = (brand.social_accounts || []).filter(
    (a) => a.status === "active" || a.status === "error"
  );

  const connectedPlatforms = new Set(
    connectedAccounts.map((a) => a.platform)
  );

  const availablePlatforms: Platform[] = ["facebook", "instagram", "linkedin", "youtube"];

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Back + Header */}
      <div>
        <Link
          href="/dashboard/brands"
          className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Brands
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-base font-bold"
              style={{ backgroundColor: brand.color }}
            >
              {brand.logo_url ? (
                <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                getInitials(brand.name)
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-surface-900">{brand.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {brand.industry && (
                  <span className="text-xs text-surface-400">{brand.industry}</span>
                )}
                <Badge variant="default" size="sm">{brand.tone}</Badge>
                <Badge variant={brand.is_active ? "success" : "default"} size="sm" dot>
                  {brand.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href={`/dashboard/compose?brand_id=${brand.id}`}>
              <Button leftIcon={<PenSquare className="w-4 h-4" />}>
                Create Post
              </Button>
            </Link>
            <Link href={`/dashboard/analytics?brand_id=${brand.id}`}>
              <Button variant="secondary" leftIcon={<BarChart2 className="w-4 h-4" />}>
                Analytics
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Posts", value: contentStats.total, icon: FileText },
          { label: "Published", value: contentStats.published, icon: CheckCircle },
          { label: "Scheduled", value: contentStats.scheduled, icon: Clock },
          { label: "Drafts", value: contentStats.drafts, icon: FileText },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-surface-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="w-4 h-4 text-surface-400" />
              <span className="text-xs text-surface-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-semibold text-surface-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Social Accounts */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Social Accounts</CardTitle>
            </CardHeader>

            {/* Connected Accounts */}
            {connectedAccounts.length > 0 && (
              <div className="space-y-2 mb-4">
                {connectedAccounts.map((account) => {
                  const Icon = PLATFORM_ICONS[account.platform as Platform];
                  const config = PLATFORM_CONFIG[account.platform as Platform];
                  return (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 p-3 border border-surface-100 rounded-lg"
                    >
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: config.color + "20" }}
                      >
                        {account.avatar_url ? (
                          <img
                            src={account.avatar_url}
                            alt={account.platform_account_name}
                            className="w-7 h-7 rounded"
                          />
                        ) : (
                          Icon && <Icon className="w-4.5 h-4.5" style={{ color: config.color }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-800 truncate">
                          {account.platform_account_name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-surface-400 capitalize">
                            {account.platform} · {account.account_type}
                          </span>
                          {account.status === "error" && (
                            <Badge variant="danger" size="sm">Error</Badge>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        className="w-7 h-7 flex items-center justify-center rounded text-surface-400 hover:bg-surface-100 hover:text-danger-500 transition-colors"
                        title="Disconnect"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Connect buttons */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-surface-500 mb-2">
                {connectedAccounts.length === 0 ? "Connect a social account" : "Add another account"}
              </p>
              {availablePlatforms.map((platform) => {
                const config = PLATFORM_CONFIG[platform];
                const isConnected = connectedPlatforms.has(platform);
                const isConnecting = connectingPlatform === platform;

                return (
                  <button
                    key={platform}
                    onClick={() => !isConnected && handleConnect(platform)}
                    disabled={isConnected || isConnecting}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-colors text-left",
                      isConnected
                        ? "border-surface-100 bg-surface-50 text-surface-400 cursor-default"
                        : "border-surface-200 hover:border-surface-300 hover:bg-surface-50 text-surface-700"
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: config.color + "20" }}
                    >
                      {isConnecting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" style={{ color: config.color }} />
                      ) : (
                        React.createElement(
                          PLATFORM_ICONS[platform],
                          { className: "w-4 h-4", style: { color: config.color } }
                        )
                      )}
                    </div>
                    <div className="flex-1">
                      <span>{config.label}</span>
                    </div>
                    {isConnected ? (
                      <Badge variant="success" size="sm" dot>Connected</Badge>
                    ) : (
                      <Plus className="w-4 h-4 text-surface-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Brand Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Brand Details</CardTitle>
              <Link
                href={`/dashboard/brands/${brand.id}/settings`}
                className="text-xs text-brand-600 hover:text-brand-700"
              >
                Edit
              </Link>
            </CardHeader>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-surface-400">Tone</p>
                <p className="text-surface-800 capitalize mt-0.5">{brand.tone}</p>
              </div>
              {brand.website && (
                <div>
                  <p className="text-xs text-surface-400">Website</p>
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:text-brand-700 flex items-center gap-1 mt-0.5"
                  >
                    {brand.website}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {brand.default_hashtags.length > 0 && (
                <div>
                  <p className="text-xs text-surface-400 mb-1">Default Hashtags</p>
                  <div className="flex flex-wrap gap-1">
                    {brand.default_hashtags.slice(0, 6).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-surface-400">Approval Required</p>
                <p className="text-surface-800 mt-0.5">
                  {brand.require_approval ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Need React import for createElement call
import React from "react";
