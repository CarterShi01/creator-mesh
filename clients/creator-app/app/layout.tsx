import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TabBar } from "@/components/TabBar";

export const metadata: Metadata = {
  title: "CreatorMesh",
  description: "Super-individual dispatch control plane",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CreatorMesh",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="h-full flex flex-col" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
        {/* dvh handles iOS Safari's collapsing/expanding browser chrome */}
        <div className="flex flex-col" style={{ height: "100dvh" }}>
          <main className="flex-1 overflow-hidden">{children}</main>
          <TabBar />
        </div>
      </body>
    </html>
  );
}
