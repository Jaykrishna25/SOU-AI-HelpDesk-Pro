/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ["@prisma/client", "prisma"],
};

module.exports = nextConfig;
