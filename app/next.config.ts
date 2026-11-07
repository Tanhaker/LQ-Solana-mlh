import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // @anchor-lang/core's browser build references `fs` in a Node-only wallet
    // helper we never call; give the browser bundle an empty module for it.
    resolveAlias: {
      fs: { browser: "./lib/empty.ts" },
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
