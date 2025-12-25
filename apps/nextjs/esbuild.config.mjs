import fs from "fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import path from "path";
import { build } from "esbuild";
import * as glob from "glob";

const __dirname = dirname(fileURLToPath(import.meta.url));

function findHomarrPackages(rootDir) {
  const homarrPackages = new Set();
  const packagePaths = glob.sync(`${rootDir}/**/package.json`);

  for (const pkgPath of packagePaths) {
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    homarrPackages.add(pkgJson.name);
  }
  return homarrPackages;
}

const rootDir = path.join(__dirname, "..", "..");
const homarrPackages = findHomarrPackages(rootDir);

const homarrPlugin = {
  name: "homarr-external-plugin",
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      // Check if it's an internal @homarr package
      if (args.path.startsWith("@homarr/")) {
        return; // Let esbuild bundle internal @homarr packages
      }

      // Check if it's a node_module and not an @homarr package
      if (!path.isAbsolute(args.path) && !args.path.startsWith(".")) {
        return { path: args.path, external: true }; // Mark as external
      }

      return; // Let esbuild handle other resolutions
    });
  },
};

build({
  entryPoints: ["server.ts"],
  bundle: true,
  outfile: "server.mjs",
  platform: "node",
  format: "esm",
  minify: true,
  plugins: [homarrPlugin],
  external: ["*.scss", "*.css"],
}).catch(() => process.exit(1));
