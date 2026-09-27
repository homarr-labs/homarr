import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Deliberately opt-in: each mutation must break a named behavioral assertion.
const mutations = [
  {
    name: "wud-authentication",
    source: "packages/integrations/src/wud/wud-integration.ts",
    before: "return { Authorization: `Basic ${credentials}` };",
    after: "return { Authorization: `Bearer ${credentials}` };",
    test: "network.contract.test.ts",
    assertion: "WUD connects behind a subpath with Basic auth and returns the complete update list",
    failure: "Incorrect request header: authorization",
  },
  {
    name: "sonarr-progress",
    source: "packages/integrations/src/media-organizer/sonarr/sonarr-integration.ts",
    before: "Math.round(((sizeTotal - sizeLeft) / sizeTotal) * 100)",
    after: "Math.round((sizeLeft / sizeTotal) * 100)",
    test: "media.contract.test.ts",
    assertion: "Sonarr reads a bounded missing page and download queue through a proxy prefix",
    failure: "AssertionError: expected { totalCount: 4",
  },
  {
    name: "integration-authorization",
    source: "packages/api/src/router/integration/integration-access.ts",
    before: "if (hasFullAccess) return true;",
    after: "if (hasFullAccess || hasUseAccess) return true;",
    test: "persisted-management.contract.test.ts",
    assertion: "a persisted use-only grant allows discovery without granting credential management and can be revoked",
    failure: "promise resolved",
  },
];

interface Assertion {
  title: string;
  fullName: string;
  status: string;
  failureMessages: string[];
}
interface Results {
  numTotalTests: number;
  numPassedTests: number;
  numPendingTests: number;
  testResults: { assertionResults: Assertion[] }[];
}
const hash = (source: string) => createHash("sha256").update(source).digest("hex");
const destination = path.resolve("artifacts/regressions", new Date().toISOString().replaceAll(":", "-"));
await mkdir(destination, { recursive: true });
const originals = await Promise.all(
  mutations.map(async (mutation) => {
    const source = await readFile(mutation.source, "utf8");
    if (source.split(mutation.before).length !== 2) throw new Error(`Source guard failed: ${mutation.source}`);
    await writeFile(path.join(destination, `${mutation.name}.original`), source);
    return source;
  }),
);
let activeChild: ReturnType<typeof spawn> | undefined;
let interrupted = false;
const interrupt = () => {
  interrupted = true;
  activeChild?.kill("SIGTERM");
};
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);

async function run(label: string, selected: string[]) {
  if (interrupted) throw new Error("Regression proof interrupted");
  const child = spawn(process.execPath, ["--import", "tsx", "tests/run.mts", ...selected], { stdio: "inherit" });
  activeChild = child;
  const code = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (status) => resolve(status ?? 1));
  });
  activeChild = undefined;
  if (interrupted) throw new Error("Regression proof interrupted");
  await cp("artifacts/tests", path.join(destination, label), { recursive: true });
  const results: Results = JSON.parse(await readFile(path.join(destination, label, "results.json"), "utf8"));
  return { code, results, assertions: results.testResults.flatMap((file) => file.assertionResults) };
}
function requireGreen(result: Awaited<ReturnType<typeof run>>) {
  if (
    result.code !== 0 ||
    !result.results.numTotalTests ||
    result.results.numPendingTests ||
    result.results.numPassedTests !== result.results.numTotalTests ||
    !mutations.every((mutation) =>
      result.assertions.some((assertion) => assertion.title === mutation.assertion && assertion.status === "passed"),
    )
  ) {
    throw new Error("All selected contracts and mutation target assertions must pass without mutations");
  }
}
const evidence: {
  name: string;
  source: string;
  originalSha256: string;
  mutatedSha256: string;
  detectedAssertion: string;
}[] = [];
let failure: string | undefined;
async function restore(source: string, original: string, changed: string, name: string) {
  const current = await readFile(source, "utf8");
  if (current !== changed && current !== original) {
    throw new Error(`Concurrent source edit; restore manually from ${destination}/${name}.original`);
  }
  await writeFile(source, original);
}
try {
  const selected = mutations.map((mutation) => mutation.test);
  requireGreen(await run("baseline", selected));
  for (const [index, mutation] of mutations.entries()) {
    const original = originals[index];
    if (original === undefined) throw new Error(`Missing original source: ${mutation.source}`);
    if ((await readFile(mutation.source, "utf8")) !== original)
      throw new Error(`Concurrent source edit: ${mutation.source}`);
    const changed = original.replace(mutation.before, mutation.after);
    try {
      await writeFile(mutation.source, changed);
      const result = await run(mutation.name, [mutation.test]);
      const detected = result.assertions.find(
        (assertion) =>
          assertion.title === mutation.assertion &&
          assertion.status === "failed" &&
          assertion.failureMessages.some((message) => message.includes(mutation.failure)),
      );
      if (result.code === 0 || !detected)
        throw new Error(`${mutation.name}: expected behavioral failure was not detected`);
      evidence.push({
        name: mutation.name,
        source: mutation.source,
        originalSha256: hash(original),
        mutatedSha256: hash(changed),
        detectedAssertion: detected.fullName,
      });
    } finally {
      // Restore byte-for-byte, including any edits present before this proof began.
      await restore(mutation.source, original, changed, mutation.name);
    }
  }
  requireGreen(await run("restored", selected));
} catch (error) {
  failure = String(error);
  console.error(error);
  process.exitCode = 1;
} finally {
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  await writeFile(
    path.join(destination, "proof.json"),
    JSON.stringify(
      {
        command: "pnpm exec tsx tests/prove-regressions.mts",
        success: failure === undefined,
        failure,
        mutations: evidence,
        boundary: "Three deliberate regressions detected by named assertions; not exhaustive mutation coverage.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Regression proof: ${destination}`);
}
