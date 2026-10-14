import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [nitro(), react()],
  server: { host: "127.0.0.1", port: 3100, strictPort: true },
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          input: "./src/entry-server.tsx",
          external: [/\/nitro-experiment\/src\/server\//],
          makeAbsoluteExternalsRelative: false,
        },
      },
    },
    client: {
      build: { rollupOptions: { input: "./src/entry-client.tsx" } },
    },
  },
});
