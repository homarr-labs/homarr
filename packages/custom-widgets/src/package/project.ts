import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";

import { customWidgetArchiveSchema } from "./archive";
import { assertWidgetArtifactIntegrity } from "./integrity";
import { customWidgetPackageSchema } from "./schema";
import type { CustomWidgetPackage } from "./schema";

export const WIDGET_PROJECT_MANIFEST = "homarr-widget.json";
const ignored = new Set(["node_modules", ".git", ".homarr-widgets", "dist", "coverage"]);
const sourceExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".svg",
  ".txt",
  ".md",
]);
const binaryTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

export async function loadCustomWidgetProject(inputPath: string) {
  const path = resolve(inputPath);
  const directory = (await stat(path)).isDirectory();
  const manifestPath = directory ? join(path, WIDGET_PROJECT_MANIFEST) : path;
  const input: unknown = JSON.parse(await readFile(manifestPath, "utf8"));
  const archive = customWidgetArchiveSchema.safeParse(input);
  if (archive.success) {
    assertWidgetArtifactIntegrity(archive.data.artifact, archive.data.source);
    return { source: archive.data.source, archive: archive.data, projectDirectory: dirname(manifestPath) };
  }
  if (!directory) return { source: customWidgetPackageSchema.parse(input), projectDirectory: dirname(path) };
  if (input === null || typeof input !== "object" || Array.isArray(input))
    throw new Error("Invalid widget project manifest");
  const files: Record<string, string> = {};
  let size = 0;
  async function collect(current: string) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || ignored.has(entry.name) || entry.isSymbolicLink()) continue;
      const filePath = join(current, entry.name);
      if (entry.isDirectory()) {
        await collect(filePath);
        continue;
      }
      const name = relative(path, filePath).replaceAll("\\", "/");
      if (name === WIDGET_PROJECT_MANIFEST || ["package.json", "package-lock.json", "tsconfig.json"].includes(name))
        continue;
      if (name.endsWith(".artifact.json") || name.endsWith(".homarr-widget.json")) continue;
      const extension = extname(name);
      if (!sourceExtensions.has(extension) && !binaryTypes[extension]) continue;
      const metadata = await stat(filePath);
      size += metadata.size;
      if (metadata.size > 5_000_000 || size > 20_000_000 || Object.keys(files).length >= 256)
        throw new Error("Widget project exceeds package size limits");
      const content = await readFile(filePath);
      files[name] = content.toString("utf8");
      if (binaryTypes[extension]) files[name] = `data:${binaryTypes[extension]};base64,${content.toString("base64")}`;
    }
  }
  await collect(path);
  return { source: customWidgetPackageSchema.parse({ ...input, files }), projectDirectory: path };
}

export async function writeCustomWidgetProject(input: CustomWidgetPackage, directory: string) {
  const source = customWidgetPackageSchema.parse(input);
  if (Object.hasOwn(source.files, WIDGET_PROJECT_MANIFEST))
    throw new Error(`Package source cannot overwrite ${WIDGET_PROJECT_MANIFEST}`);
  const target = resolve(directory);
  await mkdir(dirname(target), { recursive: true });
  await mkdir(target); // Refuse existing destinations; scaffolding never overwrites someone else's project.
  for (const [path, content] of Object.entries(source.files)) {
    const filePath = join(target, path);
    await mkdir(dirname(filePath), { recursive: true });
    let value: string | Buffer = content;
    if (binaryTypes[extname(path)] && /^data:[^,]+;base64,/u.test(content))
      value = Buffer.from(content.slice(content.indexOf(",") + 1), "base64");
    await writeFile(filePath, value, { flag: "wx", mode: 0o600 });
  }
  const { files: _files, ...manifest } = source;
  await writeFile(join(target, WIDGET_PROJECT_MANIFEST), JSON.stringify(manifest, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  if (!Object.hasOwn(source.files, ".gitignore"))
    await writeFile(
      join(target, ".gitignore"),
      ".homarr-widget.local.json\n.homarr-widgets/\ndist/\nnode_modules/\n.env*\n",
      { flag: "wx" },
    );
  return target;
}
