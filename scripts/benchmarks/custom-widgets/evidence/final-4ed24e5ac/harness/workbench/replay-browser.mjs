import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const base = process.env.OUTPUT;
const session = process.env.AGENT_BROWSER_SESSION;
const port = Number(process.env.PORT ?? 3848);
if (!base || session !== "cw-final-replay-2" || port !== 3848)
  throw new Error("OUTPUT, authorized browser session and port are required");
const here = dirname(fileURLToPath(import.meta.url));
const env = {
  ...process.env,
  OUTPUT: base,
  PORT: String(port),
  ORIGIN: `http://127.0.0.1:${port}`,
  LABELS: "before,after,before,after",
};
let server;
function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code: code ?? 1, signal }));
  });
}
async function waitReady() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/before/index.html`);
      if (response.status === 200) return;
    } catch {}
    await delay(100);
  }
  throw new Error("Fixture server did not become ready");
}
try {
  server = spawn(process.execPath, [join(here, "serve.mjs")], { env, stdio: "inherit" });
  server.once("error", (error) => {
    throw error;
  });
  await waitReady();
  const viewport = await run("agent-browser", ["viewport", "1440", "1000"]);
  if (viewport.code !== 0) throw new Error(`Browser viewport setup failed: ${viewport.code}`);
  const replay = await run("node", [join(here, "run-browser.mjs")]);
  if (replay.code !== 0) throw new Error(`Browser replay failed: ${replay.code}`);
} finally {
  await run("agent-browser", ["close"]).catch((error) => process.stderr.write(`${error}\n`));
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("close", resolve));
  }
}
