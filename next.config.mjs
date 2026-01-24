/** @type {import('next').NextConfig} */
import withPWAInit from "@ducanh2912/next-pwa";

const nextConfig = {
    output: "standalone",
    typescript: {
        ignoreBuildErrors: true,
    },
    experimental: {
        turbopackUseSystemTlsCerts: true,
    },
};

export default nextConfig;
