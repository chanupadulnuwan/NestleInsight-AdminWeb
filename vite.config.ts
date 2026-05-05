import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET?.trim() || "http://localhost:3000";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Website auth update: proxy the shared Nest backend endpoints so the React portal can use the same auth/database locally.
      proxy: {
        "/auth": apiProxyTarget,
        "/categories": apiProxyTarget,
        "/delivery-assignments": apiProxyTarget,
        "/exports": apiProxyTarget,
        "/forecast-engine": apiProxyTarget,
        "/products": apiProxyTarget,
        "/territories": apiProxyTarget,
        "/tm": apiProxyTarget,
        "/uploads": apiProxyTarget,
        "/users": apiProxyTarget,
        "/warehouses": apiProxyTarget,
        "/sales-routes": apiProxyTarget,
        "/smart-route": apiProxyTarget,
        "/activities": apiProxyTarget,
        "/daily-reports": apiProxyTarget,
        "/store-visits": apiProxyTarget,
        "/promotions": apiProxyTarget,
        "/sales-incidents": apiProxyTarget,
        "/outlets": apiProxyTarget,
      },
    },
  };
});
