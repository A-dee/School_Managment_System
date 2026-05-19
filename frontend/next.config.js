function normalizeApiTarget(raw) {
  let target = (raw || "http://localhost:8000").trim();
  // Vercel stores only the value, but this guard handles accidentally pasted
  // "API_PROXY_TARGET=https://..." strings without breaking production builds.
  if (target.startsWith("API_PROXY_TARGET=")) {
    target = target.slice("API_PROXY_TARGET=".length).trim();
  }
  if (target.endsWith("/")) target = target.slice(0, -1);
  if (target.endsWith("/api/v1")) target = target.slice(0, -"/api/v1".length);
  return target;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const target = normalizeApiTarget(process.env.API_PROXY_TARGET);
    return [
      {
        source: "/api/v1/:path*",
        destination: `${target}/api/v1/:path*`,
      },
    ];
  },
};
module.exports = nextConfig;
