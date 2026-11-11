import type { MetadataRoute } from "next";

// Permet d'installer l'appli sur l'écran d'accueil du téléphone
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Doigt de Fée",
    short_name: "Doigt de Fée",
    description: "Stock, clients, jobs, quotes and invoices for security installers.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f4f0e6",
    theme_color: "#17201d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
