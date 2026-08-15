/**
 * Live introspection of a running Homarr container: what the server process is
 * actually holding, and optionally a heap snapshot pulled out for DevTools.
 *
 * Needs no rebuild and no restart. Node opens its inspector on SIGUSR1, so this
 * attaches to whatever is already running — including a container you started by
 * hand with `docker run homarr:performance`.
 *
 *   node --experimental-strip-types scripts/benchmarks/inspect-container.mts <container>
 *   node --experimental-strip-types scripts/benchmarks/inspect-container.mts <container> --snapshot server.heapsnapshot
 *
 * The snapshot opens in DevTools > Memory > Load. Analyse it with
 * scripts/benchmarks/analyze-heapsnapshot.mjs for a constructor histogram.
 */
import { execFile, spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const container = process.argv[2];
if (!container) {
  throw new Error("usage: inspect-container.mts <container> [--snapshot <file>]");
}
const snapshotIndex = process.argv.indexOf("--snapshot");
const snapshotPath = snapshotIndex === -1 ? undefined : process.argv[snapshotIndex + 1];

const execIn = async (script: string) => {
  const { stdout } = await execFileAsync("docker", ["exec", container, "sh", "-c", script], {
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout;
};

/**
 * Runs a Node script inside the container by piping it to stdin. Passing it via
 * `sh -c 'node -e "..."'` mangles escapes as soon as the script contains quotes or
 * newlines, which every non-trivial one does.
 */
const execNodeIn = (script: string) =>
  new Promise<string>((resolve, reject) => {
    const proc = spawn("docker", ["exec", "-i", container, "node"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => (stdout += chunk));
    proc.stderr.on("data", (chunk) => (stderr += chunk));
    proc.on("error", reject);
    proc.on("close", (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(stderr.trim() || `node exited ${code}`)),
    );
    proc.stdin.end(script);
  });

/**
 * The Next server retitles itself, and comm is truncated to 15 chars — it reads
 * "next-server (v1", not "next-server" — so these have to be prefix matches.
 */
const findServerPidAsync = async () => {
  const out = await execIn(
    `for p in /proc/[0-9]*; do n=$(cat "$p/comm" 2>/dev/null);` +
      ` case "$n" in node*|next-server*|bun*) echo "$(basename "$p") $n";; esac; done`,
  );
  const line = out.trim().split("\n").filter(Boolean)[0];
  if (!line) throw new Error("no node/next-server/bun process found in the container");
  const [pid, comm] = line.split(/\s+/);
  return { pid: Number(pid), comm: comm ?? "?" };
};

/**
 * Evaluates an expression inside the live server over CDP. Node 22+ ships a global
 * WebSocket, so the helper needs no dependency present in the image.
 */
const evaluateInServerAsync = async (webSocketUrl: string, expression: string) => {
  const client = `
const ws = new WebSocket(${JSON.stringify(webSocketUrl)});
let nextId = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message.result);
    pending.delete(message.id);
  }
});
ws.addEventListener("error", () => { console.error("inspector websocket error"); process.exit(1); });
ws.addEventListener("open", async () => {
  await send("Runtime.enable");
  const response = await send("Runtime.evaluate", {
    expression: ${JSON.stringify(expression)},
    returnByValue: true,
    awaitPromise: true,
  });
  const result = response?.result;
  if (result?.subtype === "error" || response?.exceptionDetails) {
    console.error(JSON.stringify(response, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(result?.value ?? null, null, 2));
  ws.close();
  process.exit(0);
});
`;
  return execNodeIn(client);
};

const { pid, comm } = await findServerPidAsync();
console.log(`server process: pid=${pid} (${comm})\n`);

console.log("=== cgroup and process memory ===");
console.log(
  await execIn(
    `awk '/^anon |^file |^slab /{printf "  cgroup %-6s %8.1f MiB\\n", $1, $2/1048576}' /sys/fs/cgroup/memory.stat;` +
      `awk '/^VmRSS|^RssAnon|^RssFile/{printf "  %-12s %8.1f MiB\\n", $1, $2/1024}' /proc/${pid}/status`,
  ),
);

console.log("=== per-process RSS ===");
console.log(
  await execIn(
    `for p in /proc/[0-9]*/status; do` +
      ` awk '/^Name:/{n=$2} /^VmRSS:/{printf "  %-16s %8.1f MiB\\n", n, $2/1024}' "$p" 2>/dev/null; done | sort -k2 -rn`,
  ),
);

await execIn(`kill -USR1 ${pid}`).catch(() => undefined);
await new Promise((resolve) => setTimeout(resolve, 1_500));

const listScript = `
const http = require("node:http");
http.get({ host: "127.0.0.1", port: 9229, path: "/json/list" }, (response) => {
  let body = "";
  response.on("data", (chunk) => (body += chunk));
  response.on("end", () => console.log(body));
}).on("error", (error) => { console.log("ERR " + error.message); });
`;
const listRaw = await execNodeIn(listScript).catch((error: Error) => `ERR ${error.message}`);
const webSocketUrl = /"webSocketDebuggerUrl":\s*"([^"]+)"/.exec(listRaw)?.[1];
if (!webSocketUrl) {
  console.log(`could not reach the inspector on 9229. Raw response:\n${listRaw.slice(0, 400)}`);
  process.exit(1);
}

// The inspected context has no `require` and no dynamic import — only globals — so
// read what `process` exposes directly and get the rest from CDP's own domains.
console.log("=== live heap of the running server ===");
console.log(
  await evaluateInServerAsync(
    webSocketUrl,
    `(() => {
      const usage = process.memoryUsage();
      const MiB = (bytes) => Math.round((bytes / 1048576) * 10) / 10;
      return {
        rssMiB: MiB(usage.rss),
        heapUsedMiB: MiB(usage.heapUsed),
        heapTotalMiB: MiB(usage.heapTotal),
        externalMiB: MiB(usage.external),
        arrayBuffersMiB: MiB(usage.arrayBuffers),
        uptimeSeconds: Math.round(process.uptime()),
      };
    })()`,
  ),
);

if (snapshotPath) {
  const inContainerPath = "/tmp/server.heapsnapshot";
  console.log(`\n=== taking heap snapshot over CDP ===`);
  const snapshotClient = `
const fs = require("node:fs");
const out = fs.createWriteStream(${JSON.stringify(inContainerPath)});
const ws = new WebSocket(${JSON.stringify(webSocketUrl)});
let nextId = 0;
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "HeapProfiler.addHeapSnapshotChunk") {
    out.write(message.params.chunk);
  } else if (message.id === 2) {
    out.end(() => { console.log("written"); process.exit(0); });
  }
});
ws.addEventListener("error", () => { console.error("inspector websocket error"); process.exit(1); });
ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ id: ++nextId, method: "HeapProfiler.enable" }));
  ws.send(JSON.stringify({ id: ++nextId, method: "HeapProfiler.takeHeapSnapshot", params: { reportProgress: false } }));
});
`;
  console.log((await execNodeIn(snapshotClient)).trim());
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(snapshotPath);
    const proc = spawn("docker", ["exec", container, "cat", inContainerPath]);
    proc.stdout.pipe(out);
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`docker exec cat exited ${code}`))));
  });
  console.log(`saved ${snapshotPath}`);
  console.log(`analyse: node scripts/benchmarks/analyze-heapsnapshot.mjs ${snapshotPath}`);
}
