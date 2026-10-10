import { defineConfig } from "nitro";

export default defineConfig({
  preset: "bun",
  serverDir: "./server",
  plugins: ["./server/plugins/lifecycle.ts"],
});
