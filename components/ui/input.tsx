"use client";

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftAddon, rightAddon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-surface-700 mb-1">
            {label}
            {props.required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {leftAddon && (
            <div className="absolute left-3 text-surface-400">{leftAddon}</div>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full h-9 rounded border bg-white text-sm text-surface-900",
              "placeholder:text-surface-400",
              "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500",
              "disabled:bg-surface-50 disabled:text-surface-400 disabled:cursor-not-allowed",
              error
                ? "border-danger-500 focus:ring-danger-500"
                : "border-surface-300",
              leftAddon ? "pl-9" : "px-3",
              rightAddon ? "pr-9" : "px-3",
              className
            )}
            {...props}
          />
          {rightAddon && (
            <div className="absolute right-3 text-surface-400">{rightAddon}</div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-surface-500">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  charLimit?: number;
  currentLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, charLimit, currentLength, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-surface-700 mb-1">
            {label}
            {props.required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full rounded border bg-white text-sm text-surface-900 p-3 resize-none",
            "placeholder:text-surface-400",
            "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500",
            "disabled:bg-surface-50 disabled:cursor-not-allowed",
            error ? "border-danger-500" : "border-surface-300",
            className
          )}
          {...props}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-danger-600">{error}</span>
          <span className="text-xs text-surface-400 ml-auto">
            {hint && !charLimit && !error && hint}
            {charLimit !== undefined && currentLength !== undefined && (
              <span
                className={
                  currentLength > charLimit
                    ? "text-danger-500"
                    : currentLength > charLimit * 0.9
                    ? "text-warning-500"
                    : ""
                }
              >
                {currentLength}/{charLimit}
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
