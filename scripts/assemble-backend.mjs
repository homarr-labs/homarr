import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const repository = fileURLToPath(new URL("..", import.meta.url));
const worker = process.argv.includes("--worker");
let application = "backend";
if (worker) application = "worker";
const output = join(repository, "apps", application, "build");
const modules = join(output, "node_modules");
const externals = [
  "bcrypt",
  "pg",
  "dockerode",
  "isomorphic-dompurify",
  "jsdom",
  "undici",
  "universal-github-app-jwt",
  "ssh2",
];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const assets = spawnSync(process.execPath, ["packages/backend-handlers/scripts/prepare-assets.ts"], {
  cwd: repository,
  stdio: "inherit",
});
if (assets.status !== 0) {
  throw new Error("Failed to prepare backend assets", { cause: assets.error });
}

const version = JSON.parse(readFileSync(join(repository, "package.json"), "utf8")).version;
// Bun 1.4.2's bundler emits undefined namespaces for external export-star
// declarations. esbuild preserves those exports; Bun still runs the server.
const result = await build({
  absWorkingDir: repository,
  entryPoints: {
    index: join(repository, "apps", application, "src/index.ts"),
    cli: join(repository, "packages/cli/src/index.ts"),
    "migrations/sqlite": join(repository, "packages/db/migrations/sqlite/migrate.ts"),
    "migrations/postgresql": join(repository, "packages/db/migrations/postgresql/migrate.ts"),
  },
  outdir: output,
  bundle: true,
  platform: "node",
  format: "esm",
  splitting: true,
  target: "esnext",
  packages: "bundle",
  external: [...externals, "bun", "bun:*"],
  minify: true,
  charset: "utf8",
  metafile: true,
  plugins: [
    {
      name: "bun-sqlite-driver",
      setup(builder) {
        builder.onLoad({ filter: /packages\/core\/src\/infrastructure\/db\/drivers\/sqlite\.ts$/ }, () => ({
          contents: readFileSync(join(repository, "scripts/runtime/sqlite.ts"), "utf8"),
          loader: "ts",
          resolveDir: join(repository, "scripts/runtime"),
        }));
      },
    },
  ],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env.HOMARR_VERSION": JSON.stringify(version),
  },
});

writeFileSync(join(output, "bundle-meta.json"), JSON.stringify(result.metafile, null, 2));
const emittedInputs = new Set(
  Object.values(result.metafile.outputs).flatMap((artifact) =>
    Object.entries(artifact.inputs)
      .filter(([, input]) => input.bytesInOutput > 0)
      .map(([path]) => path),
  ),
);
const emittedExternals = new Set(
  Object.values(result.metafile.outputs).flatMap((artifact) =>
    artifact.imports.filter((entry) => entry.external).map((entry) => entry.path),
  ),
);
const frontendInputs = [...emittedInputs].filter(
  (path) =>
    path.includes("apps/nextjs/") ||
    /(?:^|\/)node_modules\/(?:next|next-auth|react|react-dom|@mantine\/[^/]+)\//.test(path),
);
if (frontendInputs.length > 0) {
  throw new Error(`Backend imports frontend code:\n${frontendInputs.join("\n")}`);
}
if (worker) {
  const legacyInputs = [...emittedInputs].filter(
    (path) => path.startsWith("apps/backend/") || /node_modules\/(?:@trpc\/|@orpc\/trpc\/)/.test(path),
  );
  if (legacyInputs.length > 0) throw new Error(`Worker imports legacy RPC code:\n${legacyInputs.join("\n")}`);
}

// Native addons and packages that read adjacent files keep their package layout.
// Resolve every dependency from its own source directory so nested versions are
// preserved without copying the monorepo's frontend dependency tree.
const installed = new Map();
const packageDirectory = (name, start) => {
  let directory = start;
  while (true) {
    const candidate = join(directory, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) {
      return realpathSync(candidate);
    }
    const parent = dirname(directory);
    if (parent === directory) {
      return undefined;
    }
    directory = parent;
  }
};
const rootSources = new Map(externals.map((name) => [name, packageDirectory(name, repository)]));

const copyPackage = (name, sourceParent, destinationParent, optional = false) => {
  if (
    worker &&
    (name.startsWith("@trpc/") ||
      name === "@orpc/trpc" ||
      ["next", "next-auth", "react", "react-dom", "better-sqlite3"].includes(name) ||
      name.startsWith("@mantine/"))
  ) {
    throw new Error(`Worker runtime dependency imports forbidden package ${name}`);
  }
  const source = packageDirectory(name, sourceParent);
  if (!source) {
    if (optional) {
      return;
    }
    throw new Error(`Missing runtime dependency ${name} required by ${sourceParent}`);
  }

  let ancestor = destinationParent;
  while (ancestor.startsWith(output)) {
    if (installed.get(join(ancestor, "node_modules", name)) === source) {
      return;
    }
    ancestor = dirname(ancestor);
  }

  let destination = join(modules, name);
  const preferredRoot = rootSources.get(name);
  if (
    (preferredRoot && preferredRoot !== source) ||
    (installed.has(destination) && installed.get(destination) !== source)
  ) {
    destination = join(destinationParent, "node_modules", name);
  }
  if (installed.get(destination) === source) {
    return;
  }
  installed.set(destination, source);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, {
    recursive: true,
    dereference: true,
    filter: (path) => {
      if (path === source) return true;
      const parts = path.slice(source.length + 1).split("/");
      if (parts.includes("node_modules")) return false;
      if (
        parts.some((part) =>
          ["test", "tests", "__tests__", "examples", ".github", "node_gyp_bins", "obj.target"].includes(part),
        )
      ) {
        return false;
      }
      // Optional SSH acceleration is disabled by Homarr's Bun-specific patch.
      if (name === "ssh2" && parts.includes("build")) return false;
      if (extname(path) === ".map" || /\.d\.[cm]?ts$/.test(path)) return false;
      if (basename(path) === "binding.gyp") return false;
      return true;
    },
  });

  const manifest = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    // These optional Node accelerators are never loaded by the Bun worker.
    if (dependency.startsWith("@types/") || dependency === "cpu-features" || dependency === "better-sqlite3") continue;
    copyPackage(dependency, source, destination, dependency in (manifest.optionalDependencies ?? {}));
  }
  for (const dependency of Object.keys(manifest.optionalDependencies ?? {})) {
    if (dependency.startsWith("@types/") || dependency === "cpu-features" || dependency === "better-sqlite3") continue;
    copyPackage(dependency, source, destination, true);
  }
  for (const dependency of Object.keys(manifest.peerDependencies ?? {})) {
    // Optional peers include unused database drivers and their type packages.
    // Runtime-selected optional drivers are listed explicitly above.
    if (manifest.peerDependenciesMeta?.[dependency]?.optional === true) {
      continue;
    }
    copyPackage(dependency, source, destination);
  }
};

for (const name of externals) {
  if ([...emittedExternals].some((path) => path === name || path.startsWith(`${name}/`))) {
    copyPackage(name, repository, output);
  }
}

mkdirSync(join(output, "assets"), { recursive: true });
cpSync(join(repository, "node_modules/sql.js/dist/sql-wasm.wasm"), join(output, "assets/sql-wasm.wasm"));
// Drizzle only needs SQL and its journal when applying migrations. Studio's
// schema snapshots and bundled Node runners do not belong in the worker.
for (const dialect of ["sqlite", "postgresql"]) {
  const source = join(repository, "packages/db/migrations", dialect);
  const destination = join(output, "db/migrations", dialect);
  mkdirSync(join(destination, "meta"), { recursive: true });
  cpSync(join(source, "meta/_journal.json"), join(destination, "meta/_journal.json"));
  for (const name of readdirSync(source)) {
    if (name.endsWith(".sql")) cpSync(join(source, name), join(destination, name));
  }
}
writeFileSync(join(output, "package.json"), JSON.stringify({ type: "module" }));
console.log(`${application} assembled at ${resolve(output)} with ${installed.size} runtime packages`);
