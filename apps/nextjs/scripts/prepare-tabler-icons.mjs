import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const spritePackagePath = require.resolve("@tabler/icons-sprite/package.json");
const spritePackage = JSON.parse(await readFile(spritePackagePath, "utf8"));
const reactPackagePath = require.resolve("@tabler/icons-react/package.json");
const reactPackage = JSON.parse(await readFile(reactPackagePath, "utf8"));
// The icon metadata (categories and search tags) ships with @tabler/icons, which the React package builds on. Its
// exports allow no file to be resolved, so the package folder is looked up along Node's module paths instead.
const iconsPackageDirectory = (createRequire(reactPackagePath).resolve.paths("@tabler/icons") ?? [])
  .map((directory) => join(directory, "@tabler", "icons"))
  .find((directory) => existsSync(join(directory, "icons.json")));
if (!iconsPackageDirectory) throw new Error("Could not find @tabler/icons next to @tabler/icons-react.");
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

// A compact index for icon pickers: category names once, then per icon its category and a few search tags. Read
// only when a picker opens, so the full metadata file never reaches a bundle.
const MAX_TAGS = 8;
const metadata = JSON.parse(await readFile(join(iconsPackageDirectory, "icons.json"), "utf8"));
const categories = [...new Set(Object.values(metadata).map((icon) => icon.category || "Other"))].toSorted();
const icons = Object.fromEntries(
  Object.values(metadata).map((icon) => {
    const nameWords = new Set(icon.name.split("-"));
    const tags = [...new Set((icon.tags ?? []).map((tag) => String(tag).toLowerCase().trim()))]
      .filter((tag) => tag && !nameWords.has(tag))
      .slice(0, MAX_TAGS);
    return [icon.name, [categories.indexOf(icon.category || "Other"), tags.join(" ")]];
  }),
);
await writeFile(join(versionDirectory, "meta.json"), JSON.stringify({ categories, icons }));
