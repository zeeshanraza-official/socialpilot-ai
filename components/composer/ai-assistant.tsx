"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Check, Copy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Brand, Platform } from "@/types";
import toast from "react-hot-toast";

interface AiAssistantProps {
  brand: Brand;
  platform: Platform;
  currentCaption: string;
  onApply: (caption: string, hashtags: string[]) => void;
}

interface GeneratedContent {
  caption: string;
  hashtags: string[];
  first_comment: string;
  generation_id?: string;
}

export function AiAssistant({ brand, platform, currentCaption, onApply }: AiAssistantProps) {
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedContent[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [tab, setTab] = useState<"generate" | "variations">("generate");

  const generate = async () => {
    if (!topic.trim()) {
      toast.error("Enter a topic first");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brand.id,
          topic,
          platform,
          tone: brand.tone,
          include_cta: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");

      setResults([json.data]);
      setSelectedIdx(0);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const generateVariations = async () => {
    if (!currentCaption.trim()) {
      toast.error("Write a caption first to generate variations");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/ai/variations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brand.id,
          caption: currentCaption,
          platform,
          count: 3,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");

      const variationResults: GeneratedContent[] = json.data.variations.map(
        (v: string) => ({
          caption: v,
          hashtags: [],
          first_comment: "",
        })
      );
      setResults(variationResults);
      setSelectedIdx(0);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const applySelected = () => {
    if (results[selectedIdx]) {
      onApply(results[selectedIdx].caption, results[selectedIdx].hashtags);
      toast.success("Caption applied");
    }
  };

  return (
    <div className="border border-brand-200 rounded-lg bg-brand-50/50 p-3">
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles className="w-3.5 h-3.5 text-brand-600" />
        <span className="text-xs font-semibold text-brand-700">AI Content Assistant</span>
        <span className="text-xs text-brand-500 ml-auto">Brand: {brand.name}</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(["generate", "variations"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-colors",
              tab === t
                ? "bg-brand-600 text-white"
                : "text-surface-600 hover:bg-brand-100"
            )}
          >
            {t === "generate" ? "Generate New" : "Create Variations"}
          </button>
        ))}
      </div>

      {tab === "generate" && (
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder={`Topic for ${platform} post...`}
            className="flex-1 h-8 px-3 rounded border border-surface-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button
            size="sm"
            variant="primary"
            loading={generating}
            onClick={generate}
            type="button"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {tab === "variations" && (
        <Button
          size="sm"
          variant="primary"
          loading={generating}
          onClick={generateVariations}
          type="button"
          className="w-full mb-3"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Generate Variations
        </Button>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedIdx(idx)}
              className={cn(
                "p-2.5 rounded border bg-white cursor-pointer transition-colors",
                idx === selectedIdx
                  ? "border-brand-400 ring-1 ring-brand-400"
                  : "border-surface-200 hover:border-surface-300"
              )}
            >
              <p className="text-xs text-surface-700 leading-relaxed line-clamp-4">
                {result.caption}
              </p>
              {result.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {result.hashtags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="text-2xs text-brand-600 bg-brand-50 px-1 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                  {result.hashtags.length > 5 && (
                    <span className="text-2xs text-surface-400">
                      +{result.hashtags.length - 5}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          <Button
            size="sm"
            variant="primary"
            onClick={applySelected}
            type="button"
            className="w-full"
            leftIcon={<Check className="w-3.5 h-3.5" />}
          >
            Apply Selected Caption
          </Button>
        </div>
      )}
    </div>
  );
}
