import { spawn } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const fixtureBase = process.env.FIXTURE_OUTPUT;
const captureBase = process.env.OUTPUT;
const session = process.env.AGENT_BROWSER_SESSION;
const port = Number(process.env.PORT ?? 3848);
if (!fixtureBase || !captureBase || session !== "cw-final-replay-2" || port !== 3848)
  throw new Error("Fixture/capture outputs, authorized browser session and port are required");
const captures = resolve(captureBase);
await mkdir(captures, { recursive: true });
if ((await readdir(captures)).length !== 0) throw new Error("Refusing to reuse a browser capture directory");
const here = dirname(fileURLToPath(import.meta.url));
const origin = `http://127.0.0.1:${port}`;
const browserEnv = {
  ...process.env,
  OUTPUT: captureBase,
  ORIGIN: origin,
  PORT: String(port),
  LABELS: "before,after,before,after",
  AGENT_BROWSER_SESSION: session,
  AGENT_BROWSER_COLOR_SCHEME: "light",
};
const serverEnv = { ...browserEnv, OUTPUT: fixtureBase };
let server;
function run(command, args, env = browserEnv) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      resolve({ code: code ?? 1, signal, stdout, stderr, command: [command, ...args] });
    });
  });
}
async function waitReady() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(`${origin}/before/index.html`);
      if (response.status === 200) return;
    } catch {}
    await delay(100);
  }
  throw new Error("Fixture server did not become ready");
}
try {
  server = spawn(process.execPath, [join(here, "serve.mjs")], { env: serverEnv, stdio: "inherit" });
  await waitReady();
  const version = await run("agent-browser", ["--version"]);
  if (version.code !== 0) throw new Error(`Could not verify agent-browser version: ${version.code}`);
  const viewport = await run("agent-browser", ["set", "viewport", "1440", "1000", "1"]);
  if (viewport.code !== 0) throw new Error(`Browser viewport preflight failed: ${viewport.code}`);
  const media = await run("agent-browser", ["set", "media", "light"]);
  if (media.code !== 0) throw new Error(`Browser color-scheme preflight failed: ${media.code}`);
  await writeFile(
    join(captures, "browser-control.json"),
    `${JSON.stringify(
      {
        agentBrowserVersion: version.stdout.trim(),
        viewport: { command: viewport.command, result: viewport.stdout.trim(), width: 1440, height: 1000, scale: 1 },
        colorScheme: { command: media.command, result: media.stdout.trim(), value: "light" },
        session,
        origin,
      },
      null,
      2,
    )}\n`,
    { flag: "wx" },
  );
  const replay = await run(process.execPath, [join(here, "run-browser.mjs")]);
  if (replay.code !== 0) throw new Error(`Browser replay failed: ${replay.code}`);
} finally {
  await run("agent-browser", ["close"]).catch((error) => process.stderr.write(`${error}\n`));
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("close", resolve));
  }
}
