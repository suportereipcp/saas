/** @type {import('next').NextConfig} */
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // Disable in dev to avoid aggressive caching
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default withPWA(nextConfig);