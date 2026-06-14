import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PendingHonorTermsApplier } from "@/components/auth/PendingHonorTermsApplier";
import { PostHogProvider } from "@/components/analytics/PostHogProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mundial Compas",
  description: "Quiniela y chat en tiempo real para el Mundial 2026",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mundial Compas",
  },
  icons: {
    apple: "/icons/icon-192.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover" as const,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PostHogProvider>
          <PendingHonorTermsApplier />
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
