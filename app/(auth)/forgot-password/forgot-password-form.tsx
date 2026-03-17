"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: { email: string }) => {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard/settings`,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="w-10 h-10 text-success-500 mx-auto mb-3" />
        <h3 className="font-semibold text-surface-900 mb-1">Check your email</h3>
        <p className="text-sm text-surface-500">
          We sent a password reset link to your email address.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-surface-600">
        Enter your email and we'll send you a link to reset your password.
      </p>
      <Input
        label="Email"
        type="email"
        placeholder="you@company.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" className="w-full" loading={isSubmitting}>
        Send Reset Link
      </Button>
    </form>
  );
}
