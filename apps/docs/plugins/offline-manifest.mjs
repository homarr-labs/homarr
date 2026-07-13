import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const collectFiles = async (directory, root = directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const absolutePath = path.join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(absolutePath, root) : path.relative(root, absolutePath);
    }),
  );
  return files.flat();
};

export default function offlineManifestPlugin() {
  return {
    name: "workshop-offline-manifest",
    async postBuild({ outDir }) {
      const assetsDirectory = path.join(outDir, "assets");
      const assets = (await collectFiles(assetsDirectory))
        .filter((file) => /\.(?:css|js|woff2?)$/.test(file))
        .map((file) => `/assets/${file.split(path.sep).join("/")}`);
      await writeFile(path.join(outDir, "workshop-assets.json"), JSON.stringify([...assets, "/img/logo.png"]));
    },
  };
}
