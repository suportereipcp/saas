/** @type {import('next').NextConfig} */
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
    dest: "public",
    disable: false, // Force enable to verify generation
    register: true,
    skipWaiting: true,
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    swcMinify: true,
    workboxOptions: {
        disableDevLogs: false,
    },
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
