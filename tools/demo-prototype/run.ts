/** Throwaway native demo comparison. Run: bun run demo:prototype */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const scratch = mkdtempSync(join(tmpdir(), "homarr-demo-PROTOTYPE-wipe-me-"));
const container = `homarr-demo-prototype-${process.pid}`;
let node = process.env.PROTOTYPE_NODE;
if (!node) {
  const configured = spawnSync("mise", ["which", "node"], { cwd: root, encoding: "utf8" });
  if (configured.status === 0) node = configured.stdout.trim();
}
if (!node) node = "node";
const port = process.env.PROTOTYPE_PORT ?? "3080";
const children: ReturnType<typeof spawn>[] = [];
let stopping = false;
const run = (command: string, args: string[], env = process.env) => {
  const result = spawnSync(command, args, { cwd: root, env, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${command} failed`);
  return result.stdout.trim();
};
const cleanup = () => {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  spawnSync("docker", ["rm", "-f", container], { stdio: "ignore" });
};
process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});
process.on("exit", cleanup);

run("docker", [
  "run",
  "-d",
  "--rm",
  "--name",
  container,
  "--label",
  "homarr.prototype=true",
  "-p",
  "127.0.0.1::6379",
  "redis:8-alpine",
]);
const redisPort = run("docker", [
  "inspect",
  "--format",
  '{{(index (index .NetworkSettings.Ports "6379/tcp") 0).HostPort}}',
  container,
]);
const env = {
  ...process.env,
  NODE_ENV: "development",
  DEMO_MODE: "true",
  DEMO_READ_ONLY: "false",
  UNSAFE_ENABLE_MOCK_INTEGRATION: "true",
  ENABLE_DOCKER: "false",
  ENABLE_KUBERNETES: "false",
  DOCKER_ENDPOINTS: JSON.stringify([
    {
      id: "prototype-disabled",
      name: "Prototype only",
      transport: { type: "socket", path: join(scratch, "disabled-docker.sock") },
      capabilities: ["inventory"],
    },
  ]),
  DOCKER_SOCKET_PATHS: undefined,
  DOCKER_HOSTNAMES: undefined,
  DOCKER_PORTS: undefined,
  DOCKER_HOST: undefined,
  DOCKER_CERT_PATH: undefined,
  DOCKER_TLS_VERIFY: undefined,
  DOCKER_PATH_PREFIX: undefined,
  DOCKER_CLIENT_TIMEOUT: undefined,
  HOMARR_DEMO_PROTOTYPE: "true",
  DB_DRIVER: "better-sqlite3",
  DB_URL: join(scratch, "PROTOTYPE.sqlite"),
  REDIS_IS_EXTERNAL: "true",
  REDIS_HOST: "127.0.0.1",
  REDIS_PORT: redisPort,
  REDIS_DATABASE_INDEX: "0",
  REDIS_USERNAME: undefined,
  REDIS_PASSWORD: undefined,
  REDIS_TLS_CA: undefined,
  SECRET_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  AUTH_SECRET: randomBytes(32).toString("hex"),
  AUTH_PROVIDERS: "credentials",
  AUTH_COOKIE_PREFIX: `prototype-${process.pid}`,
  BASE_URL: `http://localhost:${port}`,
  DISABLE_REDIS_LOGS: undefined,
  NEXT_TELEMETRY_DISABLED: "1",
};
console.log(`Scratch data: ${scratch}\nThe comparison uses mock services. It does not contact Home Assistant.`);
console.log(
  run(node, ["--import", "tsx", "packages/db/migrations/sqlite/migrate.ts", "packages/db/migrations/sqlite"], env),
);
run(node, ["apps/nextjs/scripts/prepare-tabler-icons.mjs"], env);
for (const [args, cwd] of [
  [["--import", "tsx", "apps/websocket/src/main.ts"], root],
  [
    ["../../node_modules/next/dist/bin/next", "dev", "--hostname", "0.0.0.0", "--port", port],
    join(root, "apps/nextjs"),
  ],
] as const) {
  const child = spawn(node, [...args], { cwd, env, stdio: "inherit" });
  children.push(child);
  child.on("exit", (code, signal) => {
    if (stopping) return;
    console.error(`Prototype service stopped (${signal ?? code}); stopping the comparison.`);
    process.exit(code || 1);
  });
  child.on("error", (error) => {
    console.error(error);
    process.exit(1);
  });
}
console.log(
  `Compare: http://localhost:${port}/boards/demo-prototype?variant=A\nUse the demo sign-in button. Arrow keys switch proposals; the header tabs switch board sections.`,
);
