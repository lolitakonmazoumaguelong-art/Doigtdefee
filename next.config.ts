import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (base locale) embarque du WASM : on le laisse hors du bundle serveur
  serverExternalPackages: ["@electric-sql/pglite"],
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
