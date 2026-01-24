import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { PwaRegistry } from "@/components/pwa-registry";
import { Toaster } from "sonner";
import { Geist, Geist_Mono } from "next/font/google"; // Import Geist
import "./globals.css";

// Configure Geist fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SAAS PCP",
  description: "Starter Kit for PCP Support",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "SAAS PCP",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <link rel="manifest" href="/manifest.json" />
        {children}
        <Toaster position="top-right" richColors />
        <PwaRegistry />
      </body>
    </html>
  );
}
