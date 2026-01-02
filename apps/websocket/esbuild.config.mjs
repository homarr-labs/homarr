import { build } from "esbuild";

import { externalExceptMonorepoPlugin } from "@homarr/esbuild-config/plugins";

build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "wssServer.cjs",
  platform: "node",
  //format: "esm",
  minify: true,
  plugins: [externalExceptMonorepoPlugin],
  external: ["*.scss", "*.css"],
}).catch(() => process.exit(1));

/*
    "build": "esbuild src/main.ts --bundle --platform=node --outfile=wssServer.cjs --external:bcrypt --external:@opentelemetry/api --external:deasync --external:cpu-features --loader:.html=text --loader:.scss=text --loader:.node=text",

    */
