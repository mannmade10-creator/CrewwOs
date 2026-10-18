// app/layout.tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrewwOS — The AI Agent Platform for Every Industry",
  description:
    "19 AI agents that run your communications, sales, content, and operations — 24/7, for any industry. Built for businesses, artists, and beyond.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
