/** @type {import('next').NextConfig} */
const nextConfig = {
  // Verification builds set NEXT_DIST_DIR so they never overwrite the running dev server's cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

module.exports = nextConfig;
