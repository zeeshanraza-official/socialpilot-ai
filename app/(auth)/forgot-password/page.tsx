import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset Password" };

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-surface-900">SocialPilot AI</h1>
          </div>
          <p className="text-sm text-surface-500">Reset your password</p>
        </div>

        <div className="bg-white border border-surface-200 rounded-xl shadow-surface p-6">
          <ForgotPasswordForm />
        </div>

        <p className="text-center mt-6 text-sm text-surface-500">
          Remember it?{" "}
          <a href="/login" className="text-brand-600 hover:text-brand-700 font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
