import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const selected = process.argv.slice(2);
if (selected.some((value) => value.startsWith("-")))
  throw new Error("Pass a test filename or name fragment, not runner options");
const directory = await mkdtemp(path.join(tmpdir(), "homarr-contracts-"));
const artifactDirectory = path.resolve("artifacts/tests");
await mkdir(artifactDirectory, { recursive: true });
const resultPath = path.join(artifactDirectory, "results.json");
await rm(resultPath, { force: true });

const reservation = createServer();
await new Promise<void>((resolve, reject) => {
  reservation.once("error", reject);
  reservation.listen(0, "127.0.0.1", resolve);
});
const address = reservation.address();
if (!address || typeof address === "string") throw new Error("Could not reserve a local Redis port");
const port = address.port;
await new Promise<void>((resolve) => reservation.close(() => resolve()));
const password = randomUUID();
const redis = spawn(
  "redis-server",
  [
    "--bind",
    "127.0.0.1",
    "--port",
    String(port),
    "--save",
    "",
    "--appendonly",
    "no",
    "--dir",
    directory,
    "--requirepass",
    password,
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
let redisLog = "";
redis.stdout.on("data", (chunk) => {
  redisLog += String(chunk);
});
redis.stderr.on("data", (chunk) => {
  redisLog += String(chunk);
});
let exitCode = 1;
let activeChild: ReturnType<typeof spawn> | undefined;
let interrupted = false;
const interrupt = () => {
  interrupted = true;
  activeChild?.kill("SIGTERM");
};
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);
try {
  await new Promise<void>((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error("Local Redis did not become ready")), 10_000);
    const ready = (chunk: Buffer) => {
      if (!String(chunk).includes("Ready to accept connections")) return;
      clearTimeout(deadline);
      resolve();
    };
    redis.stdout.on("data", ready);
    redis.once("error", (error) => {
      clearTimeout(deadline);
      reject(error);
    });
    redis.once("exit", (code) => {
      clearTimeout(deadline);
      reject(new Error(`Local Redis exited (${code}): ${redisLog}`));
    });
  });
  const databasePath = path.join(directory, "homarr.sqlite");
  const sqlite = new Database(databasePath);
  try {
    migrate(drizzle(sqlite), { migrationsFolder: "packages/db/migrations/sqlite" });
  } finally {
    sqlite.close();
  }
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    HOMARR_CONTRACT_RUN: "1",
    NODE_ENV: "test",
    SKIP_ENV_VALIDATION: "true",
    DB_DRIVER: "better-sqlite3",
    DB_URL: databasePath,
    SECRET_ENCRYPTION_KEY: "0".repeat(64),
    REDIS_IS_EXTERNAL: "true",
    REDIS_HOST: "127.0.0.1",
    REDIS_PORT: String(port),
    REDIS_PASSWORD: password,
    REDIS_USERNAME: "",
    REDIS_DATABASE_INDEX: "0",
    REDIS_TLS_CA: "",
    LOCAL_CERTIFICATE_PATH: path.join(directory, "certificates"),
    LOG_LEVEL: "error",
    NO_PROXY: "localhost,127.0.0.1,::1",
    // Production treats CI as a request to disable Redis. These contracts exercise real Redis.
    CI: "",
    DISABLE_REDIS_LOGS: "",
  };
  if (interrupted) throw new Error("Contract run interrupted");
  const child = spawn(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "tests/vitest.config.ts",
      "--reporter=default",
      "--reporter=json",
      `--outputFile=${resultPath}`,
      ...selected,
    ],
    { env, stdio: "inherit" },
  );
  activeChild = child;
  exitCode = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  if (interrupted) exitCode = 1;
} catch (error) {
  console.error(error);
} finally {
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  if (redis.pid && redis.exitCode === null && redis.signalCode === null) {
    const stopped = once(redis, "exit");
    redis.kill("SIGTERM");
    await stopped;
  }
  await rm(directory, { recursive: true, force: true });
  const fixtures: Record<string, string> = {};
  async function fingerprint(folder: string) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const name = path.join(folder, entry.name);
      if (entry.isDirectory()) await fingerprint(name);
      else
        fixtures[name] = createHash("sha256")
          .update(await readFile(name))
          .digest("hex");
    }
  }
  await fingerprint("tests/fixtures");
  let results: { numTotalTests?: number; numPassedTests?: number; numFailedTests?: number; numPendingTests?: number } =
    {};
  try {
    results = JSON.parse(await readFile(resultPath, "utf8"));
  } catch {
    /* Startup failures have no Vitest result. */
  }
  if (!results.numTotalTests || results.numPendingTests) exitCode = 1;
  const manifest = {
    commit: spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim(),
    dirty: Boolean(spawnSync("git", ["status", "--porcelain"], { encoding: "utf8" }).stdout.trim()),
    node: process.version,
    command: ["pnpm", "test", ...selected],
    selected,
    exitCode,
    total: results.numTotalTests ?? 0,
    passed: results.numPassedTests ?? 0,
    failed: results.numFailedTests ?? 0,
    fixtures,
    boundary:
      "Production code with local HTTP protocol fixtures, real SQLite and isolated Redis. Not live upstream compatibility proof.",
  };
  await writeFile(path.join(artifactDirectory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Repeatable test evidence: ${artifactDirectory}`);
}
process.exitCode = exitCode;
