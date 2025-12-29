import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "PhishSense Dashboard",
  description: "피싱 대응 대시보드",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
