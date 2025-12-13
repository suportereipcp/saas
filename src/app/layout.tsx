import type { Metadata } from "next";
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
  title: "PCP Starter Kit",
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
      </body>
    </html>
  );
}
