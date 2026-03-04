import type { Metadata } from "next";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "MultiBank Realtime Dashboard",
  description: "Realtime trading dashboard with Next.js, APIs, and WebSocket streaming",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
