import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scratch = process.env.PROTOTYPE_DATA_DIR ?? "/tmp/homarr-iphone-smart-stack";
const port = process.env.PROTOTYPE_PORT ?? "7395";
const redisPort = process.env.PROTOTYPE_REDIS_PORT ?? "6398";
await mkdir(scratch, { recursive: true });
const environment = {
  ...process.env,
  NODE_ENV: "development",
  DB_DRIVER: "better-sqlite3",
  DB_URL: path.join(scratch, "PROTOTYPE-wipe-me.sqlite"),
  SECRET_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  AUTH_SECRET: randomBytes(32).toString("hex"),
  AUTH_TRUST_HOST: "true",
  AUTH_COOKIE_PREFIX: "smart-stack-prototype",
  REDIS_IS_EXTERNAL: "true",
  REDIS_HOST: "127.0.0.1",
  REDIS_PORT: redisPort,
  ENABLE_DOCKER: "false",
  ENABLE_KUBERNETES: "false",
  DEMO_MODE: "false",
  LOG_LEVEL: "warn",
  BASE_URL: process.env.PROTOTYPE_PUBLIC_URL ?? `http://localhost:${port}`,
};

const run = (arguments_, cwd = root) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, arguments_, { cwd, env: environment, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Prototype setup exited with code ${code}`));
    });
  });

await run(["--import", "tsx", "scripts/prototype-adaptive-containers-seed.mts"]);
await run(["scripts/prepare-tabler-icons.mjs"], path.join(root, "apps/nextjs"));
const redis = spawn("redis-server", ["--port", redisPort, "--bind", "127.0.0.1", "--save", "", "--appendonly", "no"], {
  env: environment,
  stdio: "ignore",
});
const app = spawn(
  process.execPath,
  [path.join(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "localhost", "--port", port],
  { cwd: path.join(root, "apps/nextjs"), env: environment, stdio: "inherit" },
);
const cleanup = () => {
  app.kill("SIGTERM");
  redis.kill("SIGTERM");
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
app.on("exit", (code) => {
  redis.kill("SIGTERM");
  process.exit(code ?? 0);
});
console.log(`Native Homarr smart stack: ${environment.BASE_URL}/boards/adaptive-containers-prototype?variant=A`);
