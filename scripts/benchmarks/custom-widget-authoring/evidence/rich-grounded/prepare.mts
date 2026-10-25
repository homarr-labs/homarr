import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.env.ROOT;
const variant = process.env.LABEL;
if (!root || !variant) throw new Error("ROOT and LABEL required");
const directory = path.join(import.meta.dirname, variant);
await mkdir(directory, { recursive: true });
const { buildCustomWidgetAiPrompt } = await import(`${root}/packages/custom-widgets/src/core/ai-prompt.ts`);
const response = JSON.parse(await readFile(new URL("./response.json", import.meta.url), "utf8"));
const request =
  "Create an infrastructure overview widget. Show overall status and every summary metric; capacity with readable memory/disk units and active sessions; every service with name, status, latency, uptime and version; active incident title, severity, state, start time and affected service names; and the returned request/error history using a registered chart with a text summary. All useful data must stay reachable through sensible tabs, rows or details, not a raw JSON dump or silent truncation. Keep compact and wide tiles usable, all loading/error/empty states useful, and expose exactly one refresh. Use only the supplied GET request and returned data. checkedAt and startedAt are UTC. Do not invent requests, actions, fields, measurements or series.";
const draft = {
  name: "Infrastructure overview",
  description: "Health, capacity, incidents and traffic of a synthetic homelab.",
  iconUrl: "",
  sources: JSON.stringify({ default: { name: "Status API", baseUrl: "http://127.0.0.1:3904", auth: "none" } }),
  requests: JSON.stringify({
    overview: { path: "/v1/overview", kind: "query", method: "GET", trigger: "load", permission: "view" },
  }),
  options: "{}",
  template: "",
};
const prompt = buildCustomWidgetAiPrompt(undefined, JSON.stringify({ overview: response }), draft, request);
const source = await readFile(`${root}/packages/custom-widgets/src/core/ai-prompt.ts`);
await writeFile(path.join(directory, "prompt.md"), prompt);
await writeFile(
  path.join(directory, "provenance.json"),
  `${JSON.stringify({ variant, model: "openai/gpt-6-luna#max", method: "Offline copied-prompt roleplay; same request, fixture and draft. No production latency, billing or acceptance claims.", promptSha256: createHash("sha256").update(prompt).digest("hex"), sourceSha256: createHash("sha256").update(source).digest("hex"), responseSha256: createHash("sha256").update(JSON.stringify(response)).digest("hex"), promptChars: prompt.length }, null, 2)}\n`,
);
