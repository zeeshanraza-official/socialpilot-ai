"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle,
  Mail,
  AtSign,
  Star,
  Filter,
  Search,
  Sparkles,
  Send,
  Check,
  Archive,
  Flag,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { InboxMessage, AiReplySuggestion } from "@/types";
import toast from "react-hot-toast";

const MESSAGE_TYPE_ICONS = {
  comment: MessageCircle,
  dm: Mail,
  mention: AtSign,
  review: Star,
};

const SENTIMENT_COLORS = {
  positive: "success",
  neutral: "default",
  negative: "danger",
  unknown: "surface",
} as const;

interface InboxPageClientProps {
  brands: Array<{ id: string; name: string; color: string }>;
  initialBrandId?: string;
  initialType?: string;
}

export function InboxPageClient({
  brands,
  initialBrandId,
  initialType,
}: InboxPageClientProps) {
  const [selectedBrand, setSelectedBrand] = useState(initialBrandId || brands[0]?.id || "");
  const [selectedType, setSelectedType] = useState(initialType || "all");
  const [selectedStatus, setSelectedStatus] = useState("unread");
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [generatingReply, setGeneratingReply] = useState(false);

  const loadMessages = async () => {
    if (!selectedBrand) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        brand_id: selectedBrand,
        status: selectedStatus,
        per_page: "30",
      });
      if (selectedType !== "all") params.set("type", selectedType);

      const res = await fetch(`/api/inbox?${params}`);
      const json = await res.json();
      if (res.ok) {
        setMessages(json.data.data || []);
        setTotal(json.data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [selectedBrand, selectedType, selectedStatus]);

  const handleSelectMessage = async (message: InboxMessage) => {
    setSelectedMessage(message);
    setReplyText("");

    // Mark as read
    if (message.status === "unread") {
      await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_ids: [message.id], status: "read" }),
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, status: "read" } : m))
      );
    }
  };

  const handleGenerateReply = async () => {
    if (!selectedMessage) return;
    setGeneratingReply(true);
    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: selectedBrand,
          message_id: selectedMessage.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const suggestions: AiReplySuggestion[] = json.data.suggestions || [];
      if (suggestions.length > 0) {
        setReplyText(suggestions[0].text);
        setSelectedMessage((prev) =>
          prev ? { ...prev, ai_reply_suggestions: suggestions } : null
        );
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch("/api/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_id: selectedMessage.id,
          content: replyText.trim(),
          was_ai_suggested:
            selectedMessage.ai_reply_suggestions?.some(
              (s) => s.text === replyText
            ) || false,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success("Reply sent!");
      setReplyText("");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === selectedMessage.id ? { ...m, status: "replied" } : m
        )
      );
      setSelectedMessage((prev) => (prev ? { ...prev, status: "replied" } : null));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleBulkAction = async (action: "archive" | "read") => {
    const ids = messages.filter((m) => m.status === "unread").map((m) => m.id);
    if (ids.length === 0) return;

    const res = await fetch("/api/inbox", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message_ids: ids,
        status: action === "archive" ? "archived" : "read",
      }),
    });

    if (res.ok) {
      toast.success(`${ids.length} messages marked as ${action}`);
      loadMessages();
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Message List */}
      <div className="w-80 flex-shrink-0 border-r border-surface-200 flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-surface-100 space-y-3">
          {/* Brand select */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full h-8 px-3 rounded border border-surface-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Type tabs */}
          <div className="flex gap-1">
            {[
              { value: "all", label: "All" },
              { value: "comment", label: "Comments" },
              { value: "dm", label: "DMs" },
              { value: "mention", label: "Mentions" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setSelectedType(tab.value)}
                className={cn(
                  "flex-1 h-7 rounded text-xs font-medium transition-colors",
                  selectedType === tab.value
                    ? "bg-brand-600 text-white"
                    : "text-surface-500 hover:bg-surface-100"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full h-8 px-3 rounded border border-surface-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="unread">Unread</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
            <option value="archived">Archived</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>

        {/* Message count */}
        <div className="flex items-center justify-between px-4 py-2 bg-surface-50 border-b border-surface-100">
          <span className="text-xs text-surface-500">{total} messages</span>
          <div className="flex gap-1">
            <button
              onClick={() => handleBulkAction("read")}
              className="text-xs text-brand-600 hover:text-brand-700"
            >
              Mark all read
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-surface-200 rounded w-3/4 mb-1" />
                  <div className="h-2 bg-surface-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-8 h-8 text-surface-200 mx-auto mb-2" />
              <p className="text-sm text-surface-400">No messages</p>
            </div>
          ) : (
            messages.map((message) => {
              const Icon = MESSAGE_TYPE_ICONS[message.message_type];
              return (
                <button
                  key={message.id}
                  onClick={() => handleSelectMessage(message)}
                  className={cn(
                    "w-full text-left p-3 border-b border-surface-100 hover:bg-surface-50 transition-colors",
                    selectedMessage?.id === message.id && "bg-brand-50",
                    message.status === "unread" && "bg-white"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-surface-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-surface-600">
                      {(message.sender_name || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={cn(
                            "text-xs",
                            message.status === "unread"
                              ? "font-semibold text-surface-900"
                              : "font-medium text-surface-700"
                          )}
                        >
                          {message.sender_name || "Unknown"}
                        </span>
                        <span className="text-2xs text-surface-400">
                          {message.platform_created_at
                            ? formatRelativeDate(message.platform_created_at)
                            : ""}
                        </span>
                      </div>
                      <p className="text-xs text-surface-500 line-clamp-2">
                        {message.content}
                      </p>
                    </div>
                    {message.status === "unread" && (
                      <span className="w-2 h-2 bg-brand-500 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel - Message Detail */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedMessage ? (
          <>
            {/* Message Header */}
            <div className="p-4 border-b border-surface-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-200 flex items-center justify-center text-sm font-bold text-surface-600">
                  {(selectedMessage.sender_name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-surface-900">
                    {selectedMessage.sender_name || "Unknown Sender"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="default" size="sm">
                      {selectedMessage.platform}
                    </Badge>
                    <Badge variant="default" size="sm">
                      {selectedMessage.message_type}
                    </Badge>
                    {selectedMessage.sentiment && (
                      <Badge
                        variant={SENTIMENT_COLORS[selectedMessage.sentiment]}
                        size="sm"
                      >
                        {selectedMessage.sentiment}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleBulkAction("archive")}
                  className="w-8 h-8 flex items-center justify-center rounded text-surface-400 hover:bg-surface-100"
                  title="Archive"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Message Content */}
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="bg-surface-50 rounded-lg p-4 text-sm text-surface-700 leading-relaxed">
                {selectedMessage.content}
              </div>

              {/* AI Suggestions */}
              {selectedMessage.ai_reply_suggestions && selectedMessage.ai_reply_suggestions.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-surface-500 mb-2">
                    AI Reply Suggestions
                  </p>
                  <div className="space-y-2">
                    {selectedMessage.ai_reply_suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => setReplyText(suggestion.text)}
                        className={cn(
                          "w-full text-left p-3 rounded border text-xs text-surface-700 transition-colors",
                          replyText === suggestion.text
                            ? "border-brand-400 bg-brand-50"
                            : "border-surface-200 hover:border-surface-300 bg-white"
                        )}
                      >
                        {suggestion.text}
                        <span className="block text-2xs text-surface-400 mt-1">
                          Tone: {suggestion.tone}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reply Composer */}
            {selectedMessage.status !== "replied" && (
              <div className="border-t border-surface-200 p-4">
                <div className="flex gap-2 mb-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                    loading={generatingReply}
                    onClick={handleGenerateReply}
                    type="button"
                  >
                    AI Suggest
                  </Button>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write your reply..."
                    rows={3}
                    className="flex-1 rounded border border-surface-300 text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <Button
                    variant="primary"
                    leftIcon={<Send className="w-4 h-4" />}
                    loading={sendingReply}
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    className="self-end"
                  >
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 text-surface-200 mx-auto mb-3" />
              <p className="text-sm text-surface-400">Select a message to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
