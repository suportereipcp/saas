import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Inter } from "next/font/google"; // Import Inter
import "./globals.css";

// Configure Inter font
const inter = Inter({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "SAAS PCP",
  description: "Starter Kit for PCP Support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
