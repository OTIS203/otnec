import "./globals.css";
import React from "react";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "OTNET — Network Intelligence & Security Guard Platform",
  description: "Enterprise network monitoring, DNS traffic filtering, and scheduled access policies.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
