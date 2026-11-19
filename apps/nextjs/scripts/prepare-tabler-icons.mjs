import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const spritePackagePath = require.resolve("@tabler/icons-sprite/package.json");
const spritePackage = JSON.parse(await readFile(spritePackagePath, "utf8"));
const reactPackage = JSON.parse(await readFile(require.resolve("@tabler/icons-react/package.json"), "utf8"));
if (spritePackage.version !== reactPackage.version) {
  throw new Error("Tabler React and sprite packages must use the same version so every registered icon can render.");
}

const assetDirectory = resolve(import.meta.dirname, "../public/tabler-icons");
const versionDirectory = join(assetDirectory, spritePackage.version);
await rm(assetDirectory, { recursive: true, force: true });
await mkdir(versionDirectory, { recursive: true });
await Promise.all(
  [
    ["dist/tabler-sprite-nostroke.svg", "outline.svg"],
    ["dist/tabler-sprite-filled.svg", "filled.svg"],
    ["LICENSE", "LICENSE"],
  ].map(([source, destination]) =>
    copyFile(join(dirname(spritePackagePath), source), join(versionDirectory, destination)),
  ),
);
