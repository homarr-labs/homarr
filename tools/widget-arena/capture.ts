import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { access, appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";

const executeFile = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const viewports = [
  { id: "wide", width: 640, height: 480 },
  { id: "narrow", width: 360, height: 640 },
];
const allowedStates = ["success", "loading", "error", "empty"];

interface Candidate {
  id: string;
  caseId: string;
  status: "ready" | "invalid";
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizedPack(value: unknown): { datasetHash: string; candidates: Candidate[] } {
  if (
    !record(value) ||
    typeof value.datasetHash !== "string" ||
    !record(value.experiment) ||
    !Array.isArray(value.experiment.candidates)
  )
    throw new Error("Invalid private pack");
  const candidates = value.experiment.candidates.map((candidate: unknown): Candidate => {
    if (
      !record(candidate) ||
      typeof candidate.id !== "string" ||
      !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(candidate.id) ||
      typeof candidate.caseId !== "string" ||
      !/^[a-z][a-z-]+$/u.test(candidate.caseId)
    )
      throw new Error("Invalid public candidate metadata");
    if (candidate.status !== "ready" && candidate.status !== "invalid")
      throw new Error("Capture blocked: all 60 first attempts must be terminal");
    return { id: candidate.id, caseId: candidate.caseId, status: candidate.status };
  });
  if (candidates.length !== 60 || new Set(candidates.map((candidate) => candidate.id)).size !== 60)
    throw new Error("Capture requires exactly 60 unique terminal candidates");
  return { datasetHash: value.datasetHash, candidates };
}

const metricsScript = `(() => {
  const target = document.querySelector('[data-arena-capture]');
  if (!target) throw new Error('Capture wrapper missing');
  const frame = target.querySelector('iframe');
  const bounds = target.getBoundingClientRect();
  const inner = frame?.contentWindow;
  const body = frame?.contentDocument?.body;
  const html = frame?.contentDocument?.documentElement;
  const unavailable = target.textContent.includes('Candidate unavailable');
  const runtimeErrors = [];
  if (body?.textContent.includes('RUNTIME_RENDER_ERROR')) runtimeErrors.push('RUNTIME_RENDER_ERROR');
  let visibleOverflowElements = 0;
  if (body && inner) {
    for (const element of body.querySelectorAll('*')) {
      const style = inner.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const rect = element.getBoundingClientRect();
      let left = rect.left, right = rect.right, top = rect.top, bottom = rect.bottom;
      for (let parent = element.parentElement; parent && parent !== body; parent = parent.parentElement) {
        const parentStyle = inner.getComputedStyle(parent);
        const clip = parent.getBoundingClientRect();
        if (/(hidden|clip|auto|scroll)/.test(parentStyle.overflowX)) { left = Math.max(left, clip.left); right = Math.min(right, clip.right); }
        if (/(hidden|clip|auto|scroll)/.test(parentStyle.overflowY)) { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom); }
      }
      if (right > left && bottom > top && (left < -1 || top < -1 || right > inner.innerWidth + 1 || bottom > inner.innerHeight + 1)) visibleOverflowElements++;
    }
  }
  return {
    wrapper: { width: bounds.width, height: bounds.height },
    iframe: inner ? { innerWidth: inner.innerWidth, innerHeight: inner.innerHeight, width: frame.getBoundingClientRect().width, height: frame.getBoundingClientRect().height } : null,
    unavailable,
    captureStatus: target.getAttribute('data-arena-capture-status'),
    runtimeErrors,
    visibleOverflow: {
      horizontal: inner && html && body ? Math.max(html.scrollWidth, body.scrollWidth) > inner.innerWidth + 1 : null,
      vertical: inner && html && body ? Math.max(html.scrollHeight, body.scrollHeight) > inner.innerHeight + 1 : null,
      visibleOverflowElements
    }
  };
})()`;

async function main() {
  const { values } = parseArgs({
    options: {
      "base-url": { type: "string", default: "http://localhost:43120/en/manage/custom-widgets/arena" },
      "auth-state": { type: "string", default: join(root, ".slim/deepwork/arena-qa/admin-auth-state.json") },
      "output-dir": { type: "string" },
      pack: {
        type: "string",
        default: join(root, "apps/nextjs/src/app/[locale]/manage/custom-widgets/arena/_generated/pack.json"),
      },
      states: { type: "string", default: "success" },
      help: { type: "boolean", default: false },
    },
    strict: true,
  });
  if (values.help) {
    console.log(
      "bun tools/widget-arena/capture.ts [--base-url URL] [--auth-state PATH] [--output-dir NEW_DIRECTORY] [--pack PATH] [--states success|all|success,loading,error,empty]",
    );
    return;
  }
  const base = new URL(values["base-url"]);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password)
    throw new Error("Use a credential-free HTTP(S) arena URL");
  const pack = sanitizedPack(JSON.parse(await readFile(resolve(values.pack), "utf8")));
  const states = values.states === "all" ? allowedStates : values.states.split(",");
  if (
    !states.length ||
    states.some((state) => !allowedStates.includes(state)) ||
    new Set(states).size !== states.length
  )
    throw new Error("Unsupported or duplicate capture states");
  const authState = resolve(values["auth-state"]);
  await access(authState);
  const runId = randomUUID();
  const session = `arena-capture-${runId}`;
  const outputDir = resolve(values["output-dir"] ?? join(root, ".slim/deepwork/arena-qa/captures", runId));
  await mkdir(dirname(outputDir), { recursive: true });
  await mkdir(outputDir);
  const manifest = join(outputDir, "captures.jsonl");
  const deadline = Date.now() + 15 * 60_000;
  await writeFile(
    join(outputDir, "run.json"),
    JSON.stringify(
      {
        runId,
        datasetHash: pack.datasetHash,
        startedAt: new Date().toISOString(),
        states,
        viewports,
        expectedCaptures: pack.candidates.length * viewports.length * states.length,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  await writeFile(manifest, "", { flag: "wx" });
  async function browser(args: string[], startup = false): Promise<unknown> {
    const prefix = ["--session", session, "--json"];
    if (startup) prefix.push("--state", authState);
    let stdout: string;
    try {
      ({ stdout } = await executeFile("agent-browser", [...prefix, ...args], {
        timeout: Math.max(1000, Math.min(90_000, deadline - Date.now())),
        maxBuffer: 8 * 1024 * 1024,
      }));
    } catch {
      throw new Error(`agent-browser ${args[0] ?? "command"} failed`);
    }
    const response: unknown = JSON.parse(stdout);
    if (!record(response) || response.success !== true)
      throw new Error(`agent-browser ${args[0] ?? "command"} did not succeed`);
    return response.data;
  }
  let started = false;
  let captureCount = 0;
  let failedCount = 0;
  try {
    for (const state of states) {
      for (const candidate of pack.candidates) {
        for (const viewport of viewports) {
          const captureErrors: string[] = [];
          let metrics: unknown = null;
          let browserErrors: unknown = null;
          let screenshot: { file: string; sha256: string; width: number; height: number } | null = null;
          try {
            if (Date.now() >= deadline) throw new Error("Capture run reached the 15-minute limit before this view");
            const url = new URL(base);
            url.searchParams.set("capture", candidate.id);
            url.searchParams.set("size", viewport.id);
            url.searchParams.set("state", state);
            if (!started) {
              await browser(["open", url.href], true);
              started = true;
            }
            await browser(["errors", "--clear"]);
            await browser(["set", "viewport", String(viewport.width), String(viewport.height), "1"]);
            await browser(["open", url.href]);
            await browser(["wait", '[data-arena-capture-status="ready"], [data-arena-capture-status="unavailable"]']);
            await browser([
              "eval",
              "-b",
              Buffer.from(
                "document.querySelectorAll('nextjs-portal').forEach(element => element.style.setProperty('display', 'none', 'important')); document.fonts.ready.then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))",
              ).toString("base64"),
            ]);
            const evaluated = await browser(["eval", "-b", Buffer.from(metricsScript).toString("base64")]);
            if (!record(evaluated) || !record(evaluated.result)) throw new Error("Capture metrics unavailable");
            metrics = evaluated.result;
            const frame = evaluated.result.iframe;
            const wrapper = evaluated.result.wrapper;
            let selector = "[data-arena-capture]";
            if (record(frame)) {
              if (frame.innerWidth !== viewport.width || frame.innerHeight !== viewport.height)
                throw new Error("Actual iframe viewport does not match requested fixed size");
              if (evaluated.result.unavailable !== true) selector += " iframe";
            } else if (candidate.status === "ready" && evaluated.result.unavailable !== true)
              throw new Error("Ready candidate has no actual runtime iframe");
            if (
              selector === "[data-arena-capture]" &&
              (!record(wrapper) || wrapper.width !== viewport.width || wrapper.height !== viewport.height)
            )
              throw new Error("Unavailable capture wrapper does not match fixed size");
            const file = `${candidate.id}-${viewport.id}-${state}.png`;
            const path = join(outputDir, file);
            await browser(["screenshot", selector, path]);
            const image = await readFile(path);
            if (image.toString("hex", 0, 8) !== "89504e470d0a1a0a") throw new Error("Capture did not produce PNG");
            const width = image.readUInt32BE(16);
            const height = image.readUInt32BE(20);
            screenshot = { file, sha256: createHash("sha256").update(image).digest("hex"), width, height };
            if (width !== viewport.width || height !== viewport.height)
              captureErrors.push("Screenshot pixels do not match requested fixed size");
          } catch (error) {
            captureErrors.push(error instanceof Error ? error.message : "Capture failed");
          }
          if (started && Date.now() < deadline) {
            try {
              browserErrors = await browser(["errors"]);
            } catch {
              captureErrors.push("Browser runtime error buffer unavailable");
            }
          }
          if (captureErrors.length) failedCount++;
          captureCount++;
          const runtimeErrors: unknown[] = [];
          if (record(metrics) && Array.isArray(metrics.runtimeErrors)) runtimeErrors.push(...metrics.runtimeErrors);
          if (record(metrics) && metrics.unavailable === true && candidate.status === "ready")
            runtimeErrors.push("Generated candidate became unavailable in the actual runtime");
          await appendFile(
            manifest,
            `${JSON.stringify({ datasetHash: pack.datasetHash, candidateId: candidate.id, caseId: candidate.caseId, status: candidate.status, size: viewport.id, state, screenshot, metrics, runtimeErrors, browserErrors, captureErrors })}\n`,
          );
        }
      }
    }
  } finally {
    if (started) {
      try {
        await browser(["close"]);
      } catch {
        await appendFile(
          manifest,
          `${JSON.stringify({ runError: "Isolated browser session did not close cleanly" })}\n`,
        );
      }
    }
  }
  await writeFile(
    join(outputDir, "summary.json"),
    JSON.stringify(
      { datasetHash: pack.datasetHash, captureCount, failedCount, completedAt: new Date().toISOString() },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(JSON.stringify({ outputDir, captureCount, failedCount }));
  if (failedCount) process.exitCode = 1;
}

await main();
