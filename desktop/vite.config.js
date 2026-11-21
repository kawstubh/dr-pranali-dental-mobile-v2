import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/v1": {
        target: "https://oralyn-staging-api-assistant.onrender.com",
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
      "Content-Security-Policy": "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob: https://static.wixstatic.com; font-src 'self'; style-src 'self' 'sha256-qhJCd95xdU9CpPX4ffSP959RvZ0PU/gf+MKT/sgcirc=' 'sha256-9pKPLjS0I0hbwVCcTZ4t5UKHF90dKmWibUDICgSdZKk='; script-src 'self' 'sha256-2DJBtpR0jXSeOFb2FIyfHbOi+crsAuxFDSUqI4Se5JI='; connect-src 'self' https://oralyn-staging-api-assistant.onrender.com",
    },
  },
});
