/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  serverExternalPackages: ["@prisma/client", "prisma"],
};

module.exports = nextConfig;

