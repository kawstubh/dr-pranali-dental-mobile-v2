import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const rewriteAssistantAdminDirectory = (request, _response, next) => {
  const [pathname, query = ""] = String(request.url || "").split("?");
  if (pathname === "/assistant-admin" || pathname === "/assistant-admin/") {
    request.url = `/assistant-admin/index.html${query ? `?${query}` : ""}`;
  }
  next();
};

const assistantAdminDirectoryPlugin = {
  name: "oralyn-assistant-admin-directory-index",
  configureServer(server) {
    server.middlewares.use(rewriteAssistantAdminDirectory);
  },
  configurePreviewServer(server) {
    server.middlewares.use(rewriteAssistantAdminDirectory);
  },
};

export default defineConfig({
  plugins: [react(), assistantAdminDirectoryPlugin],
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
    headers: {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy": "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline'; connect-src 'self' https://oralyn-staging-api-assistant.onrender.com",
    },
  },
});
