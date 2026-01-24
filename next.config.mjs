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
