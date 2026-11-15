import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (base locale) embarque du WASM : on le laisse hors du bundle serveur
  serverExternalPackages: ["@electric-sql/pglite"],
  // En-têtes de sécurité envoyés avec chaque page
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
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
