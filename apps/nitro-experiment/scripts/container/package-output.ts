import { createHash } from "node:crypto";
import { lstat, readdir, readlink, realpath } from "node:fs/promises";
import { builtinModules } from "node:module";
import { dirname, join, relative, resolve } from "node:path";

const output = resolve(".output");
const forbidden =
  /^(?:next(?:$|-)|@trpc\/|ioredis$|redis$|@redis\/|@homarr\/|better-sqlite3$|vite$|typescript$|oxlint$|oxfmt$|nitro$)/;
const builtins = new Set(builtinModules.map((name) => name.replace(/^node:/, "")));
const transpiler = new Bun.Transpiler({ loader: "js", target: "bun" });
const files: { path: string; sha256: string; bytes: number }[] = [];
const symlinks: { path: string; target: string }[] = [];
const imports: { file: string; kind: string; path: string }[] = [];
const packages = new Set<string>();
let bunSqlite = false;

function checkPackage(name: string, bundled = false): void {
  if (forbidden.test(name) && !(bundled && name === "nitro"))
    throw new Error(`Forbidden production dependency: ${name}`);
  packages.add(name);
}

async function inventory(directory: string): Promise<void> {
  for (const name of (await readdir(directory)).sort()) {
    const path = join(directory, name);
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) {
      const target = await realpath(path);
      if (!target.startsWith(`${output}/`))
        throw new Error(`Output symlink escapes artifact: ${relative(output, path)}`);
      symlinks.push({ path: relative(output, path), target: await readlink(path) });
      continue;
    }
    if (stat.isDirectory()) {
      await inventory(path);
      continue;
    }
    if (!stat.isFile()) throw new Error(`Unsupported output file: ${path}`);
    const bytes = new Uint8Array(await Bun.file(path).arrayBuffer());
    const file = relative(output, path);
    files.push({ path: file, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") });
    if (name === "package.json" && file.includes("node_modules/")) {
      const metadata = (await Bun.file(path).json()) as { name?: string };
      if (metadata.name) checkPackage(metadata.name);
    }
    if (!/\.(?:mjs|cjs|js)$/.test(name)) continue;
    const code = new TextDecoder().decode(bytes);
    for (const match of code.matchAll(/\/\/#region[^\n]*node_modules\/((?:@[^/\s]+\/)?[^/\s]+)\//g)) {
      if (match[1]) checkPackage(match[1], true);
    }
    for (const dependency of transpiler.scanImports(code)) {
      imports.push({ file, kind: dependency.kind, path: dependency.path });
      if (dependency.path === "bun:sqlite") bunSqlite = true;
      if (
        dependency.path === "bun" ||
        dependency.path.startsWith("bun:") ||
        builtins.has(dependency.path.replace(/^node:/, ""))
      )
        continue;
      if (!dependency.path.startsWith("."))
        checkPackage(
          dependency.path
            .split("/")
            .slice(0, dependency.path.startsWith("@") ? 2 : 1)
            .join("/"),
        );
      const resolved = await realpath(Bun.resolveSync(dependency.path, dirname(path)));
      if (!resolved.startsWith(`${output}/`))
        throw new Error(`Import escapes production artifact: ${file} -> ${dependency.path}`);
    }
  }
}

const nitro = (await Bun.file(join(output, "nitro.json")).json()) as {
  preset: string;
  versions: { nitro: string };
  serverEntry: string;
  publicDir: string;
};
if (
  nitro.preset !== "bun" ||
  nitro.versions.nitro !== "3.0.260903-beta" ||
  nitro.serverEntry !== "server/index.mjs" ||
  nitro.publicDir !== "public"
) {
  throw new Error("Production output must match the approved Nitro 3 Bun preset and layout");
}
await inventory(output);
if (!bunSqlite) throw new Error("Production output lacks the approved Bun SQLite connector");
if (!(await lstat(join(output, "public"))).isDirectory()) throw new Error("Missing production public assets");
const input: unknown = await Bun.file("../../build-input.json").json();
const manifest: unknown = await Bun.file("package.json").json();
await Bun.write(
  "container-provenance.json",
  JSON.stringify(
    {
      schemaVersion: 1,
      input,
      applicationManifest: manifest,
      runtime: {
        name: "bun",
        version: Bun.version,
        platform: process.platform,
        arch: process.arch,
        baseImage: process.env.BUN_IMAGE,
        targetPlatform: process.env.TARGETPLATFORM,
      },
      database: {
        abstraction: "nitro/database",
        connector: "db0/bun-sqlite",
        engine: "bun:sqlite",
        path: "/app/.fixture-data/fixture.sqlite",
      },
      nitro,
      outputSha256: createHash("sha256").update(JSON.stringify({ files, symlinks })).digest("hex"),
      files,
      symlinks,
      literalImports: imports,
      observedPackages: [...packages].sort(),
      graphLimitations:
        "Literal import and generated region/package metadata inventory; computed imports and application behavior still require final integration inspection.",
    },
    null,
    2,
  ),
);
