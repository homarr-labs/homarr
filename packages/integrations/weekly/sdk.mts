import { lstat, mkdir, readFile, realpath, stat, symlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const modulePath = fileURLToPath(new URL("../../../node_modules/@self-host/testkit", import.meta.url));
const instructions =
  "Weekly SDK unavailable or incompatible. Run ajnart/self-host/testkit, then set SELF_HOST_TESTKIT_SDK to its sdk-path and run bun run setup:weekly-sdk. For local use, build ./cmd/self-host-testkit in the matching self-host checkout, set SELF_HOST_TESTKIT_BINARY to that binary and SELF_HOST_TESTKIT_SDK to <checkout>/testkit/node, then run bun run setup:weekly-sdk.";

async function validatePackage(directory: string) {
  const manifest: unknown = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8"));
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    !("name" in manifest) ||
    manifest.name !== "@self-host/testkit" ||
    !("version" in manifest) ||
    manifest.version !== "1.2.0" ||
    !("main" in manifest) ||
    manifest.main !== "./index.mjs" ||
    !("types" in manifest) ||
    manifest.types !== "./index.d.ts"
  )
    throw new Error("Expected the matching @self-host/testkit 1.2.0 Node package");
  const entries = await Promise.all([
    stat(path.join(directory, "index.mjs")),
    stat(path.join(directory, "index.d.ts")),
  ]);
  if (entries.some((entry) => !entry.isFile())) throw new Error("SDK runtime and declarations must be files");
}

async function linkSdk() {
  const source = process.env.SELF_HOST_TESTKIT_SDK;
  if (!source || !path.isAbsolute(source)) throw new Error(instructions);
  const directory = await realpath(source);
  await validatePackage(directory);
  let existing = false;
  try {
    await lstat(modulePath);
    existing = true;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  if (existing) {
    if ((await realpath(modulePath)) !== directory)
      throw new Error("Refusing to replace an existing @self-host/testkit module");
    return;
  }
  await mkdir(path.dirname(modulePath), { recursive: true });
  await symlink(directory, modulePath, "dir");
}

switch (process.argv[2]) {
  case "link":
    await linkSdk();
    break;
  case "check":
    try {
      await validatePackage(modulePath);
    } catch (error) {
      throw new Error(instructions, { cause: error });
    }
    break;
  default:
    throw new Error("Expected link or check");
}
