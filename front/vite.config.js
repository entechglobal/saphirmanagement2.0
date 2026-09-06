import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { lanQrPlugin } from "./vite-plugin-lan-qr.js";

export default defineConfig({
  plugins: [
    react(),
    lanQrPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "LOGO.svg",
        "pwa-icon.svg",
        "apple-touch-icon.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
      ],
      manifest: {
        name: "SaphirCaisse",
        short_name: "SaphirCaisse",
        description: "ERP et caisse SaphirCaisse",
        theme_color: "#B12B89",
        background_color: "#f8fafc",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        lang: "fr",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          { src: "pwa-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,json}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  server: {
    host: true,
    port: 8002,
    allowedHosts: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
  optimizeDeps: {
    include: ["sonner", "@tanstack/react-table", "@tanstack/react-table/legacy"],
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
