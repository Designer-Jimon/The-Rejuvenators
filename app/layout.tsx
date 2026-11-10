import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { RouteProgress } from "@/components/ui/route-progress";
import {
  CHURCH_DESCRIPTION,
  CHURCH_NAME,
  CHURCH_SHORT_NAME,
  CHURCH_TAGLINE,
} from "@/lib/branding";
import "./globals.css";

const siteUrl = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: CHURCH_NAME,
    template: `%s | ${CHURCH_NAME}`,
  },
  description: CHURCH_DESCRIPTION,
  keywords: [
    "church",
    "revival",
    CHURCH_NAME,
    CHURCH_TAGLINE,
    "worship",
    "Christian",
  ],
  manifest: "/api/manifest",
  icons: {
    icon: "/api/branding/logo",
    apple: "/api/branding/logo",
  },
  openGraph: {
    title: CHURCH_NAME,
    description: CHURCH_DESCRIPTION,
    siteName: CHURCH_NAME,
    type: "website",
    locale: "en_GB",
    images: [{ url: "/api/branding/logo", alt: CHURCH_NAME }],
  },
  twitter: {
    card: "summary",
    title: CHURCH_NAME,
    description: CHURCH_DESCRIPTION,
    images: ["/api/branding/logo"],
  },
  appleWebApp: {
    capable: true,
    title: CHURCH_SHORT_NAME,
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
}: Readonly<{
  children: React.ReactNode;
}>) {
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
