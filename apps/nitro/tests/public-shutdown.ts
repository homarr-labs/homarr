import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { build, createNitro, prepare } from "nitro/builder";

const signal = process.argv[2] ?? "SIGTERM";
assert(signal === "SIGTERM" || signal === "SIGINT");
const temporary = await mkdtemp(resolve(process.env.NITRO_TEST_TMPDIR ?? tmpdir(), "nitro-shutdown-"));
const fixture = resolve(import.meta.dirname, "fixtures/shutdown");
const nitro = await createNitro(
  {
    rootDir: fixture,
    preset: "bun",
    builder: "rolldown",
    serverEntry: resolve(fixture, "entry.ts"),
    plugins: [resolve(fixture, "plugin.ts")],
    buildDir: resolve(temporary, "build"),
    output: {
      dir: resolve(temporary, "output"),
      serverDir: resolve(temporary, "output/server"),
      publicDir: resolve(temporary, "output/public"),
    },
    logLevel: 0,
  },
  { dotenv: false },
);

let child: ReturnType<typeof Bun.spawn> | undefined;
let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
let timeout: ReturnType<typeof setTimeout> | undefined;
try {
  await prepare(nitro);
  await build(nitro);
  child = Bun.spawn([process.execPath, "--no-env-file", resolve(temporary, "output/server/index.mjs")], {
    env: {
      NITRO_HOST: "127.0.0.1",
      NITRO_PORT: "0",
      SERVER_SHUTDOWN_TIMEOUT: "8",
      NO_COLOR: "1",
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  assert(child.stdout instanceof ReadableStream);
  assert(child.stderr instanceof ReadableStream);
  const events: string[] = [];
  const listening = Promise.withResolvers<string>();
  const stdout = child.stdout.getReader();
  const output = (async () => {
    const decoder = new TextDecoder();
    let buffered = "";
    try {
      for (;;) {
        const { value, done } = await stdout.read();
        if (done) return;
        buffered += decoder.decode(value, { stream: true });
        const lines = buffered.split("\n");
        buffered = lines.pop() ?? "";
        for (const line of lines) {
          events.push(line);
          const address = /http:\/\/127\.0\.0\.1:\d+/.exec(line)?.[0];
          if (address) listening.resolve(address);
        }
      }
    } finally {
      stdout.releaseLock();
    }
  })();
  void output.catch(listening.reject);
  const diagnostics = new Response(child.stderr).text();
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("Owned listener did not shut down before force timeout")), 4000);
  });
  const origin = await Promise.race([listening.promise, deadline]);
  const response = await fetch(`${origin}/streams/lifetime`);
  assert.equal(response.status, 200);
  assert(response.body);
  reader = response.body.getReader();
  const first = await reader.read();
  assert.equal(new TextDecoder().decode(first.value), "public-stream-ready\n");
  const started = performance.now();
  child.kill(signal);
  await Promise.race([child.exited, deadline]);
  await output;
  const stderr = await diagnostics;
  assert(!stderr.includes("Forcibly closing"));
  assert(!stderr.includes("Graceful shutdown timed out"));
  assert.deepEqual(
    events.filter((line) => /^(cancel-|request-|contribution-|listener-|signal-)/.test(line)),
    [
      "request-aborted",
      "listener-drain-started",
      "cancel-started",
      "cancel-settled",
      "request-disposed",
      "contribution-disposed",
      "signal-handlers-removed",
    ],
  );
  console.log(`Owned Nitro/Bun ${signal} stream shutdown passed in ${Math.round(performance.now() - started)}ms`);
} finally {
  if (timeout) clearTimeout(timeout);
  if (child && child.exitCode === null) {
    child.kill("SIGKILL");
    await child.exited;
  }
  await reader?.cancel().catch(() => undefined);
  await nitro.close();
  await rm(temporary, { recursive: true, force: true });
}
