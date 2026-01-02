import { build } from "esbuild";

import { externalExceptMonorepoPlugin } from "@homarr/esbuild-config/plugins";

build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "tasks.cjs",
  platform: "node",
  //format: "esm",
  minify: true,
  plugins: [externalExceptMonorepoPlugin],
  external: ["*.scss", "*.css"],
}).catch(() => process.exit(1));
