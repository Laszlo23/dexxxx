import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/rfgame/play", destination: "/rfgame/play/index.html", permanent: false },
      { source: "/rfgame/play/", destination: "/rfgame/play/index.html", permanent: false },
    ];
  },
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
