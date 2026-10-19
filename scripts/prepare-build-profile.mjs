import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(process.argv[3] ?? path.join(import.meta.dirname, ".."));
const profile = process.argv[2];
if (profile !== "full" && profile !== "lean") {
  throw new Error("Build profile must be full or lean.");
}

const sourcePath = (relativePath) => {
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Profile source path is outside the build context: ${relativePath}`);
  }
  return absolutePath;
};

if (profile === "lean") {
  const profileDirectory = path.join(import.meta.dirname, "build-profiles", "lean");
  const manifest = JSON.parse(readFileSync(path.join(profileDirectory, "manifest.json"), "utf8"));
  const digest = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

  for (const [relativePath, expectedHash] of Object.entries(manifest.before)) {
    const file = sourcePath(relativePath);
    if (expectedHash === null) {
      if (existsSync(file)) throw new Error(`Lean profile expects a new source file: ${relativePath}`);
    } else if (!existsSync(file) || digest(file) !== expectedHash) {
      throw new Error(`Lean profile needs updating for changed source: ${relativePath}`);
    }
  }

  const patchFile = path.join(profileDirectory, "source.patch");
  for (const extraArguments of [["--dry-run"], []]) {
    const result = spawnSync("patch", ["-p1", "--batch", "--fuzz=0", "--forward", ...extraArguments, "-i", patchFile], {
      cwd: root,
      encoding: "utf8",
    });
    if (result.error || result.status !== 0) {
      throw new Error(`Could not apply lean build profile: ${result.error?.message ?? result.stderr}`);
    }
  }

  for (const relativePath of manifest.remove) rmSync(sourcePath(relativePath));
  for (const [relativePath, expectedHash] of Object.entries(manifest.after)) {
    if (digest(sourcePath(relativePath)) !== expectedHash) {
      throw new Error(`Lean profile produced unexpected source: ${relativePath}`);
    }
  }
}

writeFileSync(path.join(root, ".homarr-build-profile"), `${profile}\n`);
console.log(`Homarr build profile: ${profile}`);
