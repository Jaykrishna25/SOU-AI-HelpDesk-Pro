const path = require("path");

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingRoot: path.join(__dirname),
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@swc/**",
      "node_modules/esbuild/**",
      "node_modules/@esbuild/**",
      "node_modules/terser/**",
      "node_modules/sharp/**",
    ],
  },
};

module.exports = nextConfig;
