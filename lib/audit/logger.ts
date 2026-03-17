import { createServiceRoleClient } from "@/lib/supabase/server";

export type AuditAction =
  | "brand.create"
  | "brand.update"
  | "brand.delete"
  | "content.create"
  | "content.update"
  | "content.delete"
  | "content.approve"
  | "content.reject"
  | "post.schedule"
  | "post.publish"
  | "post.cancel"
  | "post.pause"
  | "reply.send"
  | "reply.approve"
  | "social.connect"
  | "social.disconnect"
  | "media.upload"
  | "media.delete"
  | "ai.generate"
  | "inbox.reply"
  | "inbox.archive"
  | "auth.login"
  | "auth.logout"
  | "auth.token_refresh"
  | "system.publish_success"
  | "system.publish_fail"
  | "system.rate_limit"
  | "system.auth_error"
  | "system.circuit_open";

interface AuditLogEntry {
  user_id?: string;
  brand_id?: string;
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  success?: boolean;
  error_message?: string;
}

/**
 * Write an audit log entry
 * Uses service role to bypass RLS (audit logs are append-only from server)
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    await supabase.from("audit_logs").insert({
      user_id: entry.user_id || null,
      brand_id: entry.brand_id || null,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      details: entry.details || {},
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
      success: entry.success !== false,
      error_message: entry.error_message || null,
    });
  } catch (error) {
    // Audit log failure should not break the main flow
    console.error("[AUDIT] Failed to write audit log:", error);
  }
}

/**
 * Log to console with structured format
 */
export function log(
  level: "info" | "warn" | "error",
  message: string,
  data?: Record<string, unknown>
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}
