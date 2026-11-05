import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { RouteProgress } from "@/components/ui/route-progress";
import "./globals.css";

const siteUrl = process.env.APP_URL || "http://localhost:3000";
const siteTitle = "IT IS FINISHED REVIVAL OUTREACH";
const siteDescription =
  "A Christ-centred family provoking revival through worship, the Word and service.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  keywords: [
    "church",
    "revival",
    "IT IS FINISHED REVIVAL OUTREACH",
    "worship",
    "Christian",
  ],
  manifest: "/api/manifest",
  icons: {
    icon: "/api/branding/logo",
    apple: "/api/branding/logo",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName: siteTitle,
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
  appleWebApp: {
    capable: true,
    title: "It Is Finished",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#8B1A1A",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
