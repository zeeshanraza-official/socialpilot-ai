"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types";
import toast from "react-hot-toast";

interface SettingsPageClientProps {
  user: User;
  connectionSuccess?: string;
  connectionError?: string;
}

export function SettingsPageClient({
  user,
  connectionSuccess,
  connectionError,
}: SettingsPageClientProps) {
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm({
    defaultValues: {
      full_name: user.full_name || "",
      timezone: user.timezone || "UTC",
    },
  });

  useEffect(() => {
    if (connectionSuccess) {
      toast.success(`${connectionSuccess} connected successfully!`);
    }
    if (connectionError) {
      toast.error(`Connection failed: ${connectionError}`);
    }
  }, [connectionSuccess, connectionError]);

  const onSubmit = async (data: { full_name: string; timezone: string }) => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("users")
        .update({
          full_name: data.full_name,
          timezone: data.timezone,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Settings saved");
      reset(data);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const TIMEZONES = [
    "UTC", "America/New_York", "America/Chicago", "America/Denver",
    "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin",
    "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata", "Australia/Sydney",
  ];

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-surface-900">Settings</h2>
        <p className="text-sm text-surface-500 mt-0.5">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            error={errors.full_name?.message}
            {...register("full_name", { required: "Name is required" })}
          />

          <Input
            label="Email"
            type="email"
            value={user.email}
            disabled
            hint="Contact support to change your email"
          />

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">
              Timezone
            </label>
            <select
              className="w-full h-9 px-3 rounded border border-surface-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              {...register("timezone")}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <Button type="submit" loading={saving} disabled={!isDirty}>
            Save Changes
          </Button>
        </form>
      </Card>

      {/* Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-surface-900 capitalize">
              {user.plan} Plan
            </p>
            <p className="text-xs text-surface-500 mt-0.5">
              {user.plan === "free"
                ? "1 brand, limited features"
                : user.plan === "starter"
                ? "3 brands, core features"
                : user.plan === "pro"
                ? "10 brands, all features"
                : "Unlimited brands, white-label"}
            </p>
          </div>
          {user.plan !== "agency" && (
            <Button variant="outline" size="sm">
              Upgrade Plan
            </Button>
          )}
        </div>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
        </CardHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-surface-800">Password</p>
              <p className="text-xs text-surface-400">Last changed: unknown</p>
            </div>
            <Button variant="secondary" size="sm">Change Password</Button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-surface-800">Two-Factor Authentication</p>
              <p className="text-xs text-surface-400">Not enabled</p>
            </div>
            <Button variant="secondary" size="sm">Enable 2FA</Button>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-danger-200">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <div>
          <p className="text-sm text-surface-500 mb-3">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <Button variant="danger" size="sm">
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
}
