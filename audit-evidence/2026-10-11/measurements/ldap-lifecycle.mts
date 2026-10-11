#!/usr/bin/env node
/**
 * Reproducible local measurement for LDAP bind-failure socket cleanup.
 *
 * Run with Node 24 and exposed GC from the Homarr checkout:
 *   mise exec -- node --expose-gc audit-evidence/2026-10-11/measurements/ldap-lifecycle.mts
 *
 * This file intentionally does not run itself during authoring. The default
 * mode runs nine independent, alternating baseline/after process pairs. Each
 * worker performs cumulative stages of 1, 10, 40, and 100 additional failed
 * logins against a local server that returns BindResponse invalidCredentials.
 *
 * `baseline` imports the frozen source under baseline-source; `after` imports
 * the current production source. Only @homarr/db is shimmed because the
 * synthetic server rejects the service bind before any database operation.
 * The actual authorization function, LdapClient, and installed ldapts code
 * are bundled into each worker.
 */
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { build } from "esbuild";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = dirname(scriptPath);
const repoRoot = resolve(scriptDir, "../../..");
const baselineRoot = resolve(scriptDir, "../baseline-source/packages/auth");
const productionAuthRoot = resolve(repoRoot, "packages/auth");
const authorizationRelativePath = "providers/credentials/authorization/ldap-authorization.ts";
const stages = [1, 10, 40, 100] as const;
const pairCount = 9;
const settlingDelayMs = 30;

interface StageResult {
  addedAttempts: number;
  totalAttempts: number;
  elapsedMs: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  serverOpenSockets: number;
  clientSocketHandles: number;
  rssBytes: number;
  heapUsedBytes: number;
  heapTotalBytes: number;
  externalBytes: number;
  arrayBuffersBytes: number;
}

interface WorkerResult {
  mode: "baseline" | "after";
  runtime: string;
  stages: StageResult[];
}

const sleep = (milliseconds: number) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));

const percentile = (values: number[], fraction: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
};

const collectGarbage = () => {
  const exposedGc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
  if (!exposedGc) {
    throw new Error("Run Node with --expose-gc to capture controlled post-GC memory.");
  }
  exposedGc();
};

const createRejectedBindResponse = (messageId: number) => {
  if (messageId < 0 || messageId > 127) {
    throw new Error("Synthetic LDAP response supports one-byte message ids only.");
  }
  // LDAPMessage ::= SEQUENCE { messageID INTEGER, protocolOp BindResponse }
  // BindResponse resultCode 49 is invalidCredentials; both LDAPDN and the
  // diagnostic message are empty OCTET STRINGs.
  return Buffer.from([0x30, 0x0c, 0x02, 0x01, messageId, 0x61, 0x07, 0x0a, 0x01, 0x31, 0x04, 0x00, 0x04, 0x00]);
};

const bundleAuthorization = async (sourceFile: string, outfile: string) => {
  await build({
    absWorkingDir: repoRoot,
    entryPoints: [sourceFile],
    outfile,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node24",
    packages: "bundle",
    external: ["ldapts"],
    logLevel: "silent",
    plugins: [
      {
        name: "synthetic-db-boundary",
        setup(builder) {
          builder.onResolve({ filter: /^@homarr\/db$/ }, () => ({ path: "audit-db", namespace: "audit-db" }));
          builder.onLoad({ filter: /.*/, namespace: "audit-db" }, () => ({
            contents: "export const and = () => undefined; export const eq = () => undefined;",
            loader: "js",
          }));
        },
      },
    ],
  });
};

const runWorker = async (mode: "baseline" | "after", attemptStages: readonly number[] = stages): Promise<WorkerResult> => {
  const sockets = new Set<import("node:net").Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.setNoDelay(true);
    socket.once("close", () => sockets.delete(socket));

    let pending = Buffer.alloc(0);
    let responded = false;
    socket.on("data", (chunk) => {
      if (responded) return;
      pending = Buffer.concat([pending, chunk]);
      if (pending.length < 5) return;
      // LDAPMessage begins SEQUENCE(length), INTEGER(length=1), message id.
      if (pending[0] !== 0x30 || pending[2] !== 0x02 || pending[3] !== 0x01) {
        socket.destroy();
        return;
      }
      responded = true;
      socket.write(createRejectedBindResponse(pending[4] ?? 0));
    });
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Synthetic LDAP server did not bind TCP.");

  // These synthetic values are deliberately fixed and are never emitted.
  process.env.AUTH_PROVIDERS = "ldap";
  process.env.AUTH_LDAP_URI = `ldap://127.0.0.1:${address.port}`;
  process.env.AUTH_LDAP_BIND_DN = "cn=audit-service,dc=example,dc=invalid";
  process.env.AUTH_LDAP_BIND_PASSWORD = "synthetic-service-password";
  process.env.AUTH_LDAP_BASE = "dc=example,dc=invalid";
  process.env.LOG_LEVEL = "error";
  process.env.CI = "true";
  process.env.DISABLE_REDIS_LOGS = "true";

  const authRoot = mode === "baseline" ? baselineRoot : productionAuthRoot;
  const sourceFile = join(authRoot, authorizationRelativePath);
  const bundleFile = join(scriptDir, `.ldap-lifecycle-${process.pid}.cjs`);
  let authorization: (db: unknown, credentials: { name: string; password: string }) => Promise<unknown>;

  try {
    await bundleAuthorization(sourceFile, bundleFile);
    const module = await import(`${pathToFileURL(bundleFile).href}?mode=${mode}`);
    authorization = module.authorizeWithLdapCredentialsAsync;
  } finally {
    await unlink(bundleFile).catch(() => undefined);
  }

  const latencies: number[] = [];
  const stageResults: StageResult[] = [];
  let totalAttempts = 0;
  const databaseNeverReached = {};

  for (const addedAttempts of attemptStages) {
    const start = performance.now();
    for (let attempt = 0; attempt < addedAttempts; attempt += 1) {
      const attemptStart = performance.now();
      let rejection: unknown;
      try {
        await authorization(databaseNeverReached, {
          name: "synthetic-audit-user",
          password: "synthetic-user-password",
        });
      } catch (error) {
        rejection = error;
      }
      // Verify the intended provider-level bind failure without serializing an
      // error that could contain directory details.
      if (!(rejection instanceof Error) || rejection.name !== "CredentialsSignin") {
        throw new Error("Synthetic LDAP bind did not produce the expected credentials rejection.");
      }
      latencies.push(performance.now() - attemptStart);
      totalAttempts += 1;
    }
    const elapsedMs = performance.now() - start;

    await sleep(settlingDelayMs);
    collectGarbage();
    await sleep(5);

    const memory = process.memoryUsage();
    const clientSocketHandles = process
      ._getActiveHandles()
      .filter((handle) => {
        const candidate = handle as typeof handle & { localPort?: number; remotePort?: number };
        return candidate.remotePort === address.port && candidate.localPort !== address.port;
      }).length;

    stageResults.push({
      addedAttempts,
      totalAttempts,
      elapsedMs,
      latencyP50Ms: percentile(latencies.slice(-addedAttempts), 0.5),
      latencyP95Ms: percentile(latencies.slice(-addedAttempts), 0.95),
      serverOpenSockets: sockets.size,
      clientSocketHandles,
      rssBytes: memory.rss,
      heapUsedBytes: memory.heapUsed,
      heapTotalBytes: memory.heapTotal,
      externalBytes: memory.external,
      arrayBuffersBytes: memory.arrayBuffers,
    });
  }

  for (const socket of sockets) socket.destroy();
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
  return { mode, runtime: process.version, stages: stageResults };
};

const runChild = (mode: "baseline" | "after"): Promise<WorkerResult> =>
  new Promise((resolveChild, rejectChild) => {
    const child = spawn(process.execPath, ["--expose-gc", scriptPath, "--worker", mode], {
      cwd: repoRoot,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "ignore"],
    });
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (output += chunk));
    child.once("error", () => rejectChild(new Error("Could not start measurement worker.")));
    child.once("close", (code) => {
      if (code !== 0) {
        rejectChild(new Error(`Measurement worker failed with exit code ${String(code)} (${mode}).`));
        return;
      }
      try {
        resolveChild(JSON.parse(output) as WorkerResult);
      } catch {
        rejectChild(new Error(`Measurement worker produced invalid JSON (${mode}).`));
      }
    });
  });

const runPairs = async () => {
  const baselineSource = join(baselineRoot, authorizationRelativePath);
  const baselineSha256 = await sha256File(baselineSource);
  const pairs: { pair: number; order: string[]; results: WorkerResult[] }[] = [];

  for (let pair = 0; pair < pairCount; pair += 1) {
    const order: ("baseline" | "after")[] = pair % 2 === 0 ? ["baseline", "after"] : ["after", "baseline"];
    const results: WorkerResult[] = [];
    for (const mode of order) {
      results.push(await runChild(mode));
    }
    pairs.push({ pair: pair + 1, order, results });
  }

  const result = {
    harness: "ldap-lifecycle",
    generatedAt: new Date().toISOString(),
    runtime: process.version,
    syntheticOnly: true,
    server: "local TCP LDAP BindResponse invalidCredentials (49)",
    pairCount,
    repeatedCycleStages: stages,
    settlingDelayMs,
    baselineSource: "audit-evidence/2026-10-11/baseline-source/packages/auth/providers/credentials/authorization/ldap-authorization.ts",
    baselineSourceSha256: baselineSha256,
    metrics: [
      "serverOpenSockets",
      "clientSocketHandles",
      "rssBytes",
      "heapUsedBytes",
      "heapTotalBytes",
      "externalBytes",
      "arrayBuffersBytes",
      "elapsedMs",
      "latencyP50Ms",
      "latencyP95Ms",
    ],
    pairs,
  };
  const reportPath = resolve(scriptDir, "ldap-lifecycle-results.json");
  await writeFile(reportPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ reportPath, pairCount, baselineSourceSha256: baselineSha256 })}\n`);
};

const sha256File = async (path: string) => {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(await readFile(path)).digest("hex");
};

const args = process.argv.slice(2);
if (args[0] === "--worker") {
  const mode = args[1];
  if (mode !== "baseline" && mode !== "after") {
    throw new Error("Worker mode must be baseline or after.");
  }
  const requestedAttempts = args[2] === undefined ? undefined : Number(args[2]);
  if (requestedAttempts !== undefined && (!Number.isSafeInteger(requestedAttempts) || requestedAttempts < 1)) {
    throw new Error("Worker attempt count must be a positive integer.");
  }
  const result = await runWorker(mode, requestedAttempts === undefined ? stages : [requestedAttempts]);
  process.stdout.write(`${JSON.stringify(result)}\n`);
} else {
  await runPairs();
}
