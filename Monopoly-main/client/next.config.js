/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // avoid double socket connections in dev
  // Consume the shared TypeScript package directly (README §3 — shared types).
  transpilePackages: ["@monopoly/shared"],
};

module.exports = nextConfig;
