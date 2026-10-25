// THROWAWAY PROTOTYPE. Fresh local data; recorded images; no CI/release actions.
// Run from this checkout: mise exec -- bun run prototype:sanity
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const root = fileURLToPath(new URL("../../", import.meta.url));
const scratch = mkdtempSync(path.join(tmpdir(), "homarr-sanity-PROTOTYPE-"));
const port = process.env.HOMARR_PROTOTYPE_PORT || "3264";
const redisPort = process.env.HOMARR_PROTOTYPE_REDIS_PORT || "6398";
const databasePath = path.join(scratch, "prototype.sqlite");
const connection = new Database(databasePath);
migrate(drizzle(connection), { migrationsFolder: path.join(root, "packages/db/migrations/sqlite") });
connection
  .prepare("INSERT INTO onboarding (id, step, previous_step) VALUES (?, ?, ?)")
  .run("prototype", "finish", "setup");
connection.close();

const environment = {
  ...process.env,
  NODE_ENV: "development",
  DB_DRIVER: "better-sqlite3",
  DB_URL: databasePath,
  AUTH_PROVIDERS: "credentials",
  AUTH_SECRET: randomBytes(32).toString("hex"),
  SECRET_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  REDIS_IS_EXTERNAL: "true",
  REDIS_HOST: "127.0.0.1",
  REDIS_PORT: redisPort,
  ENABLE_DNS_CACHING: "false",
  NO_EXTERNAL_CONNECTION: "true",
  HOMARR_SANITY_PROTOTYPE: "true",
  NEXT_TELEMETRY_DISABLED: "1",
};

const redis = spawn("redis-server", ["--bind", "127.0.0.1", "--port", redisPort, "--save", "", "--appendonly", "no"], {
  stdio: "ignore",
});
const icons = spawnSync(process.execPath, ["scripts/prepare-tabler-icons.mjs"], {
  cwd: path.join(root, "apps/nextjs"),
  env: environment,
  stdio: "inherit",
});
if (icons.status !== 0) {
  redis.kill();
  process.exit(1);
}
const app = spawn(
  process.execPath,
  [path.join(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", port],
  {
    cwd: path.join(root, "apps/nextjs"),
    env: environment,
    stdio: "inherit",
  },
);
const stop = () => {
  app.kill("SIGTERM");
  redis.kill("SIGTERM");
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
app.once("exit", (code) => {
  redis.kill("SIGTERM");
  process.exitCode = code ?? 0;
});
console.log(`\nTHROWAWAY PROTOTYPE: http://localhost:${port}/en/manage/tools/sanity-prototype?variant=A`);
console.log(`Scratch data: ${scratch}\nRecorded captures and simulated checks only.\n`);
