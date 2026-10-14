import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, lstat, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const root = resolve(app, "../..");
const action = process.argv[2] ?? "up";
if (process.argv.length > 3 || !["up", "build"].includes(action)) {
  throw new Error("Usage: bun --no-env-file apps/nitro-experiment/scripts/container/run.ts [up|build]");
}
if (Bun.version !== "1.4.2") throw new Error("Use the approved Bun 1.4.2 runtime");

const parent = existsSync(join(tmpdir(), "opencode")) ? join(tmpdir(), "opencode") : tmpdir();
const context = await mkdtemp(join(parent, "nitro-fixture-container-"));
const inputs: { path: string; sha256: string; bytes: number }[] = [];
const excluded = /^(?:node_modules|\.output|\.git|\.fixture-data|appdata|\.env.*)$|\.(?:pem|key|sqlite.*|db)$/;

async function copyInput(source: string, destination: string): Promise<void> {
  const stat = await lstat(source);
  if (stat.isSymbolicLink()) throw new Error(`Build input must not be a symlink: ${relative(root, source)}`);
  if (stat.isDirectory()) {
    for (const entry of (await readdir(source)).sort()) {
      if (!excluded.test(entry)) await copyInput(join(source, entry), join(destination, entry));
    }
    return;
  }
  if (!stat.isFile()) throw new Error(`Unsupported build input: ${relative(root, source)}`);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
  const bytes = await Bun.file(destination).arrayBuffer();
  inputs.push({
    path: relative(context, destination),
    sha256: createHash("sha256").update(new Uint8Array(bytes)).digest("hex"),
    bytes: bytes.byteLength,
  });
}

try {
  for (const name of ["package.json", "bun.lock"]) await copyInput(join(root, name), join(context, name));
  const manifest = (await Bun.file(join(context, "package.json")).json()) as {
    patchedDependencies?: Record<string, string>;
  };
  for (const patch of Object.values(manifest.patchedDependencies ?? {})) {
    const source = resolve(root, patch);
    if (!source.startsWith(`${join(root, "patches")}/`)) throw new Error("Patch input must be inside patches/");
    await copyInput(source, join(context, patch));
  }
  for (const name of ["Dockerfile", ".dockerignore"]) await copyInput(join(app, name), join(context, name));
  for (const name of [
    "package.json",
    "tsconfig.json",
    "nitro.config.ts",
    "vite.config.ts",
    "src",
    "server",
    "scripts/container",
  ]) {
    await copyInput(join(app, name), join(context, "apps/nitro-experiment", name));
  }
  if (existsSync(join(app, "public")))
    await copyInput(join(app, "public"), join(context, "apps/nitro-experiment/public"));
  inputs.sort((left, right) => left.path.localeCompare(right.path));
  const commit = Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: root });
  await Bun.write(
    join(context, "build-input.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        gitCommit: commit.exitCode === 0 ? commit.stdout.toString().trim() : null,
        sourceBasis: "staged file bytes, including uncommitted application and packaging changes",
        inputSha256: createHash("sha256").update(JSON.stringify(inputs)).digest("hex"),
        files: inputs,
      },
      null,
      2,
    ),
  );
  const command = ["docker", "compose", "--env-file", "/dev/null", "-f", join(app, "compose.yaml")];
  command.push(
    ...(action === "build" ? ["build", "fixture"] : ["up", "--build", "--wait", "--wait-timeout", "90", "fixture"]),
  );
  const child = Bun.spawn(command, {
    cwd: app,
    env: { ...process.env, NITRO_FIXTURE_BUILD_CONTEXT: context },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  process.exitCode = await child.exited;
} finally {
  await rm(context, { recursive: true, force: true });
}
