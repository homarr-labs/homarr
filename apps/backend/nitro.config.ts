import { fileURLToPath } from "node:url";

import { defineConfig } from "nitro";

export default defineConfig({
  preset: "bun",
  entry: fileURLToPath(new URL("./server/entry.ts", import.meta.url)),
  serverDir: fileURLToPath(new URL("./server", import.meta.url)),
  plugins: [fileURLToPath(new URL("./server/plugins/lifecycle.ts", import.meta.url))],
  noExternals: [/\/apps\/backend\//, /\/packages\/contracts\//],
});
