import { build } from "esbuild";
import { sassPlugin } from "esbuild-sass-plugin";

build({
  entryPoints: ["server.ts"],
  bundle: true,
  outfile: "dist/server.cjs",
  platform: "node",
  target: "ES2024",
  plugins: [sassPlugin()],
  external: ["@opentelemetry/api", "critters", "next", "better-sqlite3", "bcrypt", "cpu-features"],
  loader: {
    ".css": "css",
  },
}).catch(() => process.exit(1));
