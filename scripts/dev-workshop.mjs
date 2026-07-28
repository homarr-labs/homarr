import { spawn } from "node:child_process";

const composeArgs = ["compose", "-f", "apps/workshop/docker-compose.yml"];
const pocketBaseUrl = "http://127.0.0.1:8090";
const requiredCollections = ["submissions", "workshop_listings"];
const isWindows = process.platform === "win32";
const children = new Set();
let shuttingDown = false;

try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  // The Workshop has safe local defaults when no .env file exists. GitHub OAuth remains optional.
}

function start(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: isWindows,
    ...options,
  });
  child.once("error", (error) => {
    child.spawnError = error;
  });
  children.add(child);
  child.once("close", () => children.delete(child));
  return child;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: isWindows,
      ...options,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function endpointIsReady(path) {
  try {
    const response = await fetch(`${pocketBaseUrl}${path}`, {
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForWorkshop(compose) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (compose.spawnError) throw compose.spawnError;
    if (compose.exitCode !== null) {
      throw new Error(`PocketBase stopped before it became ready (exit ${compose.exitCode})`);
    }

    const checks = [
      endpointIsReady("/api/health"),
      ...requiredCollections.map((collection) =>
        endpointIsReady(`/api/collections/${collection}/records?page=1&perPage=1`),
      ),
    ];
    if ((await Promise.all(checks)).every(Boolean)) return;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error("PocketBase did not expose its health endpoint and required collections within 120 seconds");
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }

  try {
    await run("docker", [...composeArgs, "stop", "workshop"], {
      env: workshopEnvironment,
      stdio: "ignore",
    });
  } catch (error) {
    console.error("Could not stop the Workshop container cleanly:", error);
    exitCode ||= 1;
  }

  process.exitCode = exitCode;
}

const workshopEnvironment = {
  ...process.env,
  PB_EXPOSE_PORT: "8090",
  PB_ALLOWED_ORIGINS: process.env.PB_ALLOWED_ORIGINS ?? "*",
  WORKSHOP_PUBLIC_ORIGIN: process.env.WORKSHOP_PUBLIC_ORIGIN ?? "http://127.0.0.1:3003",
  WORKSHOP_WEB_URL: process.env.WORKSHOP_WEB_URL ?? "http://127.0.0.1:3003/workshop",
};

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => void shutdown());
}

const compose = start("docker", [...composeArgs, "up", "--build", "workshop"], {
  env: workshopEnvironment,
});

try {
  console.log("Waiting for PocketBase health and Workshop collections on http://127.0.0.1:8090 …");
  await waitForWorkshop(compose);
  console.log("Workshop is ready. Starting documentation on http://127.0.0.1:3003/workshop …");

  const docs = start("pnpm", ["--filter", "@homarr/docs", "dev"], {
    env: {
      ...process.env,
      HOMARR_WEBSITE_URL: process.env.HOMARR_WEBSITE_URL ?? "http://127.0.0.1:3003",
      WORKSHOP_API_URL: process.env.WORKSHOP_API_URL ?? pocketBaseUrl,
      WORKSHOP_WEB_URL: process.env.WORKSHOP_WEB_URL ?? "http://127.0.0.1:3003/workshop",
      DOCS_BASE_URL: process.env.DOCS_BASE_URL ?? "/",
    },
  });

  const exitCode = await new Promise((resolve) => {
    const handleError = (error) => {
      console.error(error);
      resolve(1);
    };
    compose.once("error", handleError);
    docs.once("error", handleError);
    compose.once("exit", (code) => resolve(code ?? 1));
    docs.once("exit", (code) => resolve(code ?? 1));
  });
  await shutdown(exitCode);
} catch (error) {
  console.error(error);
  await shutdown(1);
}
