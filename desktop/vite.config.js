import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/v1": {
        target: "https://oralyn-multitenant-staging.onrender.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: ["oralyn-web-portal-spa.onrender.com"],
  },
});
