import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const base = (process.env.VITE_REMOTE_BASE_PATH ?? "/remote").replace(/\/$/, "");

export default defineConfig({
  base: `${base}/`,
  plugins: [tanstackStart({ spa: { enabled: true } }), react()],
  server: {
    proxy: {
      [`${base}/api`]: { target: process.env.REMOTE_PLATFORM_URL ?? "http://127.0.0.1:3104", changeOrigin: false },
      [`${base}/auth`]: { target: process.env.REMOTE_PLATFORM_URL ?? "http://127.0.0.1:3104", changeOrigin: false },
    },
  },
});
