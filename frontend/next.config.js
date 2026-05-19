function normalizeApiTarget(raw) {
  let target = (raw || "http://localhost:8000").trim();
  // Vercel stores only the value, but these guards handle accidentally pasted
  // KEY=value strings or quoted values without breaking production builds.
  if (target.includes("=") && !target.startsWith("http")) {
    target = target.slice(target.indexOf("=") + 1).trim();
  }
  target = target.replace(/^['"]|['"]$/g, "");

  if (target.startsWith("http://") && !target.includes("localhost") && !target.includes("127.0.0.1")) {
    target = `https://${target.slice("http://".length)}`;
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
