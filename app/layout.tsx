// app/layout.tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrewwOS — The AI Agent Platform for Every Industry",
  description:
    "19 AI agents that run your communications, sales, content, and operations — 24/7, for any industry. Built for businesses, artists, and beyond.",
  metadataBase: new URL("https://crewwos.com"),
  openGraph: {
    type: "website",
    url: "https://crewwos.com",
    siteName: "CrewwOS",
    title: "CrewwOS — The AI Agent Platform for Every Industry",
    description:
      "19 AI agents that run your communications, sales, content, and operations — 24/7, for any industry. Built for businesses, artists, and beyond.",
    images: [
      {
        url: "/og-image-business.png",
        width: 1200,
        height: 630,
        alt: "CrewwOS — The AI Agent Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CrewwOS — The AI Agent Platform for Every Industry",
    description:
      "19 AI agents that run your communications, sales, content, and operations — 24/7, for any industry.",
    images: ["/og-image-business.png"],
  },
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
