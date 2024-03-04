import { defineConfig } from "vite";
import { VitePluginNode } from "vite-plugin-node";

export default defineConfig({
  plugins: [
    ...VitePluginNode({
      adapter: "nest",
      appPath: "./src/main.ts",
      tsCompiler: "swc",
    }),
  ],
  optimizeDeps: {
    // Vite does not work well with optionnal dependencies,
    // mark them as ignored for now
    exclude: [
      "@nestjs/microservices",
      "@nestjs/websockets",
      "cache-manager",
      "class-transformer",
      "class-validator",
      "fastify-swagger",
    ],
    esbuildOptions: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
        },
      },
    },
  },
  server: {
    port: 3100,
  },
});
