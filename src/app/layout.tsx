import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Outfit } from "next/font/google"; // Import Outfit
import "./globals.css";

// Configure Outfit font
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400'], // User requested 400
  variable: '--font-outfit',
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
        className={`${outfit.variable} font-sans antialiased`}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
