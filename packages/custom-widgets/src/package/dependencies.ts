import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { CustomWidgetPackage } from "./schema";

export interface WidgetDependencyOptions {
  rootDirectory: string;
  allowDependencyInstall?: boolean;
  signal?: AbortSignal;
}

const installations = new Map<string, Promise<string>>();

export async function prepareCustomWidgetDependencies(
  widget: CustomWidgetPackage,
  digest: string,
  options: WidgetDependencyOptions,
): Promise<string> {
  const directory = join(options.rootDirectory, "dependencies", digest);
  const pending = installations.get(directory);
  if (pending) return pending;
  const work = prepare(directory, widget, options).finally(() => installations.delete(directory));
  installations.set(directory, work);
  return work;
}

async function prepare(
  directory: string,
  widget: CustomWidgetPackage,
  options: WidgetDependencyOptions,
): Promise<string> {
  const manifest = { name: "homarr-trusted-widget", private: true, dependencies: widget.dependencies };
  try {
    const installed = await readFile(join(directory, ".ready"), "utf8");
    if (installed === JSON.stringify(manifest)) return directory;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  if (!options.allowDependencyInstall)
    throw new Error("This widget requires dependency installation after owner trust");
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "package.json"), JSON.stringify(manifest), { mode: 0o600 });
  await install(directory, options.signal);
  await writeFile(join(directory, ".ready"), JSON.stringify(manifest), { mode: 0o600 });
  return directory;
}

function install(directory: string, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--omit=dev"], {
      cwd: directory,
      stdio: ["ignore", "pipe", "pipe"],
      signal,
      timeout: 120_000,
      env: { ...process.env, npm_config_cache: join(directory, ".npm-cache") },
    });
    let output = "";
    const collect = (chunk: Buffer) => {
      output = `${output}${chunk.toString()}`.slice(-16_384);
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Widget dependency installation failed (${code}): ${output}`));
    });
  });
}
