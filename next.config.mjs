/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
};
export default nextConfig;

// UPDATE: Forçando rebuild para injetar chaves do Supabase