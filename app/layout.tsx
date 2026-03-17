import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { QueryProvider } from "@/components/providers/query-provider";

export const metadata: Metadata = {
  title: {
    template: "%s | SocialPilot AI",
    default: "SocialPilot AI — Multi-Brand Social Media Management",
  },
  description:
    "AI-powered multi-brand social media management platform. Schedule, create, and analyze posts across Facebook, Instagram, LinkedIn, and YouTube.",
  keywords: [
    "social media management",
    "AI content creation",
    "social media scheduler",
    "brand management",
    "SocialPilot",
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <QueryProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1e293b",
                color: "#f8fafc",
                borderRadius: "6px",
                fontSize: "13px",
                padding: "10px 14px",
              },
              success: {
                iconTheme: { primary: "#22c55e", secondary: "#f8fafc" },
              },
              error: {
                iconTheme: { primary: "#ef4444", secondary: "#f8fafc" },
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
