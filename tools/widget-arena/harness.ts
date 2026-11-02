import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

import {
  customWidgetPreviewDefinitionSchema,
  getCustomWidgetJsonSchema,
} from "../../packages/custom-widgets/src/core/schema";
import {
  CUSTOM_WIDGET_ASSISTANT_COMPONENT_REFERENCE,
  CUSTOM_WIDGET_SKILL_REFERENCES,
} from "../../packages/custom-widgets/src/core/authoring-resources";
import type {
  ArenaCandidate,
  ArenaMatch,
  ArenaPrivatePack,
} from "../../apps/nextjs/src/app/[locale]/manage/custom-widgets/arena/_arena-contract";
import {
  ARENA_CLOCK,
  ARENA_VIEWPORTS,
  ARENA_STATES,
} from "../../apps/nextjs/src/app/[locale]/manage/custom-widgets/arena/_arena-contract";
import { createFixtures } from "./fixture-source";
import { arenaTemplateAdmission } from "./admission";
import { inspectAssistantModels, observeSession } from "./provenance";
import type { SessionEvidence } from "./provenance";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const durable = join(root, ".slim/deepwork/widget-arena");
const fixturePath = "apps/nextjs/src/app/[locale]/manage/custom-widgets/arena/_fixtures.json";
const contextPath = "tools/widget-arena/context.json";
const groups = [
  ["ntfy", "currency", "dog-facts", "ha-cameras"],
  ["game-server", "sonarr", "your-spotify", "wireguard"],
  ["netronome", "proxmox-security", "monthly-calendar", "event-feed"],
];
const model = "openai/gpt-6.1-sol#medium";
const provenance =
  "New uniformly synthetic fixtures inspired by a recovered 40-input Langfuse task frame; no historical fixtures, grades or expected outputs.";

interface Condition {
  id: string;
  name: string;
  prompt: string;
  promptHash: string;
}
interface Job {
  id: string;
  conditionId: string;
  caseIds: string[];
  outputPath: string;
}
interface Plan {
  version: number;
  id: string;
  freezeHash: string;
  model: string;
  conditions: Condition[];
  jobs: Job[];
}
interface Receipt {
  jobId: string;
  artifactPath: string;
  artifactSha256: string;
  session: string;
  requestedModel: string;
  evidence: SessionEvidence;
  freezeHash: string;
  records: (ArenaCandidate & { conditionId: string })[];
  batchIssues: string[];
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
function json(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}
function opaque(seed: string) {
  const bytes = createHash("sha256").update(seed).digest();
  bytes[6] = ((bytes[6] ?? 0) & 15) | 64;
  bytes[8] = ((bytes[8] ?? 0) & 63) | 128;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
async function put(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, json(value));
}
async function getPlan(): Promise<Plan> {
  const value: unknown = JSON.parse(await readFile(join(durable, "plan.json"), "utf8"));
  if (!isRecord(value) || !Array.isArray(value.conditions) || !Array.isArray(value.jobs))
    throw new Error("Invalid private plan");
  return parsePlan(value);
}
function parsePlan(value: Record<string, unknown>): Plan {
  if (
    value.version !== 1 ||
    typeof value.id !== "string" ||
    typeof value.freezeHash !== "string" ||
    value.model !== model
  )
    throw new Error("Invalid plan metadata");
  if (!Array.isArray(value.conditions) || !Array.isArray(value.jobs)) throw new Error("Invalid plan collections");
  const conditions = value.conditions.map((entry: unknown) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.name !== "string" ||
      typeof entry.prompt !== "string" ||
      typeof entry.promptHash !== "string"
    )
      throw new Error("Invalid condition");
    return { id: entry.id, name: entry.name, prompt: entry.prompt, promptHash: entry.promptHash };
  });
  const jobs = value.jobs.map((entry: unknown) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.conditionId !== "string" ||
      typeof entry.outputPath !== "string" ||
      !Array.isArray(entry.caseIds) ||
      !entry.caseIds.every((id: unknown) => typeof id === "string")
    )
      throw new Error("Invalid job");
    return { id: entry.id, conditionId: entry.conditionId, caseIds: entry.caseIds, outputPath: entry.outputPath };
  });
  return { version: 1, id: value.id, freezeHash: value.freezeHash, model, conditions, jobs };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function sourceHashes(directory: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "test") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) Object.assign(result, await sourceHashes(path));
    else result[relative(root, path)] = hash(await readFile(path, "utf8"));
  }
  return result;
}
async function freeze() {
  const fixtures = createFixtures();
  const context = {
    schema: getCustomWidgetJsonSchema(),
    components: JSON.parse(CUSTOM_WIDGET_ASSISTANT_COMPONENT_REFERENCE),
    runtime: CUSTOM_WIDGET_SKILL_REFERENCES["references/runtime.md"],
    security: CUSTOM_WIDGET_SKILL_REFERENCES["references/security.md"],
    protocol:
      "Write ONCE a strict JSON ARRAY of four {caseId,definition} to assigned absolute outputPath via patch. Only template changes. No validation/feedback/rewrite/retry. Final reply only JSON acknowledgement {jobId,artifact,caseIds}, not definitions. No markdown or templateLines.",
  };
  const sources = await sourceHashes(join(root, "packages/custom-widgets/src"));
  for (const path of [
    "bun.lock",
    "package.json",
    "packages/custom-widgets/package.json",
    "tools/widget-arena/contract.md",
    "tools/widget-arena/harness.ts",
    "tools/widget-arena/fixture-source.ts",
    "tools/widget-arena/admission.ts",
    "tools/widget-arena/provenance.ts",
    "apps/nextjs/src/app/[locale]/manage/custom-widgets/arena/_arena-contract.ts",
    "apps/nextjs/public/images/demo-dashboard-background.svg",
  ])
    sources[path] = hash(await readFile(join(root, path), "utf8"));
  const fingerprints = { fixtures: hash(json(fixtures)), context: hash(json(context)), sources };
  await put(join(root, fixturePath), fixtures);
  await put(join(root, contextPath), context);
  await put(join(root, "tools/widget-arena/freeze.json"), { ...fingerprints, freezeHash: hash(json(fingerprints)) });
  console.log("Frozen 12 synthetic cases and actual installed runtime/catalog; no generations launched.");
}
async function verifyFreeze() {
  const path = join(root, "tools/widget-arena/freeze.json");
  const frozen: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!isRecord(frozen) || !isRecord(frozen.sources) || typeof frozen.freezeHash !== "string")
    throw new Error("Missing freeze");
  for (const [file, expected] of Object.entries(frozen.sources)) {
    if (hash(await readFile(join(root, file), "utf8")) !== expected) throw new Error(`Frozen runtime changed: ${file}`);
  }
  if (
    hash(await readFile(join(root, fixturePath), "utf8")) !== frozen.fixtures ||
    hash(await readFile(join(root, contextPath), "utf8")) !== frozen.context
  )
    throw new Error("Frozen common inputs changed");
  return frozen.freezeHash;
}
async function prepare(paths: string[]) {
  if (paths.length !== 5) throw new Error("prepare requires exactly five prompt paths");
  const freezeHash = await verifyFreeze();
  const conditions: Condition[] = [];
  for (const [index, path] of paths.entries()) {
    const prompt = await readFile(resolve(root, path), "utf8");
    if (!prompt.trim()) throw new Error(`Empty prompt: ${path}`);
    const stem = (path.split("/").at(-1) ?? path).replace(/\.[^.]+$/u, "");
    conditions.push({
      id: `condition-${index + 1}`,
      name: stem.charAt(0).toUpperCase() + stem.slice(1),
      prompt,
      promptHash: hash(prompt),
    });
  }
  const id = hash(json({ freezeHash, prompts: conditions.map((condition) => condition.promptHash), model }));
  const jobs = conditions.flatMap((condition) =>
    groups.map((caseIds, index) => ({
      id: `${condition.id}-batch-${index + 1}`,
      conditionId: condition.id,
      caseIds,
      outputPath: join(durable, "raw", `${condition.id}-batch-${index + 1}.json`),
    })),
  );
  const plan: Plan = { version: 1, id, freezeHash, model, conditions, jobs };
  await mkdir(durable, { recursive: true });
  await mkdir(join(durable, "raw"), { recursive: true });
  await writeFile(join(durable, "plan.json"), json(plan), { flag: "wx" });
  for (const job of jobs) {
    const condition = conditions.find((entry) => entry.id === job.conditionId);
    await put(join(durable, "assignments", `${job.id}.json`), {
      jobId: job.id,
      outputPath: job.outputPath,
      model,
      freezeHash,
      prompt: condition?.prompt,
      contextPath,
      contractPath: "tools/widget-arena/contract.md",
      cases: createFixtures().filter((entry) => job.caseIds.includes(entry.id)),
    });
  }
  console.log(
    `Prepared ${jobs.length} private four-case assignments; 60 pending first attempts. No dispatch performed.`,
  );
}

export function validateBatch(raw: string, caseIds: string[], seed: string, conditionId: string) {
  const cases = createFixtures();
  let parsed: unknown;
  const batchIssues: string[] = [];
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    batchIssues.push(`Invalid strict JSON: ${String(error)}`);
  }
  if (!Array.isArray(parsed)) batchIssues.push("Raw first-attempt artifact must be a JSON array");
  const entries: unknown[] = [];
  if (Array.isArray(parsed)) entries.push(...parsed);
  if (entries.length !== caseIds.length)
    batchIssues.push(`Expected ${caseIds.length} entries; received ${entries.length}`);
  if (entries.some((entry) => !isRecord(entry) || typeof entry.caseId !== "string" || !caseIds.includes(entry.caseId)))
    batchIssues.push("Unassigned or malformed entry");
  const records = caseIds.map((caseId) => {
    const issues = [...batchIssues];
    const matches = entries.filter((entry) => isRecord(entry) && entry.caseId === caseId);
    const entry = matches[0];
    if (matches.length !== 1) issues.push(`Expected exactly one entry for ${caseId}; received ${matches.length}`);
    const base = cases.find((item) => item.id === caseId)?.definition;
    let definition: ArenaCandidate["definition"] = null;
    if (isRecord(entry)) {
      if (Object.keys(entry).toSorted().join(",") !== "caseId,definition")
        issues.push("Entry keys must be exactly caseId,definition");
      if (
        !isRecord(entry.definition) ||
        typeof entry.definition.template !== "string" ||
        Object.hasOwn(entry.definition, "templateLines")
      )
        issues.push("Definition requires template string only");
      else {
        const { template: _template, ...actual } = entry.definition;
        const { template: _baseTemplate, ...expected } = base ?? {};
        if (!isDeepStrictEqual(actual, expected)) issues.push("Frozen non-template fields changed");
        const checked = customWidgetPreviewDefinitionSchema.safeParse(entry.definition);
        if (!checked.success)
          issues.push(...checked.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
        else {
          if (checked.data.template !== entry.definition.template)
            issues.push("Template is not already normalized; no automatic repair allowed");
          issues.push(...arenaTemplateAdmission(checked.data.template));
          if (/\bDate\.(?:now|create)\s*\(/u.test(checked.data.template))
            issues.push("Use the fixed fixture clock, not current time");
          definition = checked.data;
        }
      }
    }
    if (issues.length) definition = null;
    const status: ArenaCandidate["status"] = issues.length ? "invalid" : "ready";
    return {
      id: opaque(`${seed}:candidate:${conditionId}:${caseId}`),
      caseId,
      conditionId,
      definition,
      status,
      issues,
    };
  });
  return { records, batchIssues };
}

async function importBatch(jobId: string | undefined, rawPath: string | undefined, session: string | undefined) {
  if (!jobId || !rawPath || !session) throw new Error("import requires JOB ASSIGNED_ARTIFACT_PATH SESSION_ID");
  const plan = await getPlan();
  if ((await verifyFreeze()) !== plan.freezeHash) throw new Error("Plan freeze mismatch");
  const job = plan.jobs.find((entry) => entry.id === jobId);
  if (!job) throw new Error("Unknown assignment");
  let raw = "";
  const artifactIssues: string[] = [];
  if (resolve(rawPath) !== job.outputPath) artifactIssues.push("Artifact path does not match the frozen assignment");
  else {
    try {
      raw = await readFile(job.outputPath, "utf8");
    } catch {
      artifactIssues.push("Raw first-attempt JSON artifact is missing or unreadable");
    }
  }
  await mkdir(join(durable, "receipts"), { recursive: true });
  await writeFile(join(durable, "receipts", `${jobId}.raw.txt`), raw, { flag: "wx" });
  const evidence = await observeSession(session);
  const validated = validateBatch(raw, job.caseIds, plan.id, job.conditionId);
  evidence.issues.push(...artifactIssues);
  const records = applyProvenance(validated.records, evidence.issues);
  const receipt: Receipt = {
    jobId,
    artifactPath: job.outputPath,
    artifactSha256: hash(raw),
    session,
    requestedModel: model,
    evidence,
    freezeHash: plan.freezeHash,
    records,
    batchIssues: [...validated.batchIssues, ...evidence.issues],
  };
  await writeFile(join(durable, "receipts", `${jobId}.json`), json(receipt), { flag: "wx" });
  console.log(
    json({
      jobId,
      ready: receipt.records.filter((entry) => entry.status === "ready").length,
      invalid: receipt.records.filter((entry) => entry.status === "invalid").length,
      batchIssues: receipt.batchIssues,
    }),
  );
}

function applyProvenance(records: Receipt["records"], issues: string[]): Receipt["records"] {
  if (!issues.length) return records;
  return records.map((record) => ({
    ...record,
    definition: null,
    status: "invalid",
    issues: [...record.issues, ...issues],
  }));
}

async function receiptProvenance(jobId: string, raw: string, freezeHash: string): Promise<string[]> {
  try {
    const receipt: unknown = JSON.parse(await readFile(join(durable, "receipts", `${jobId}.json`), "utf8"));
    if (
      !isRecord(receipt) ||
      receipt.jobId !== jobId ||
      receipt.artifactSha256 !== hash(raw) ||
      receipt.artifactPath !== join(durable, "raw", `${jobId}.json`) ||
      receipt.freezeHash !== freezeHash ||
      !isRecord(receipt.evidence)
    )
      return ["Missing or mismatched private provenance receipt"];
    const evidence = receipt.evidence;
    if (
      evidence.source !== "opencode-v2-api" ||
      evidence.sessionId !== receipt.session ||
      !Array.isArray(evidence.issues) ||
      !Array.isArray(evidence.observedModels) ||
      evidence.observedModels.length === 0 ||
      !Array.isArray(evidence.responseHashes) ||
      evidence.responseHashes.length < 2
    )
      return ["Incomplete private provenance evidence"];
    if (evidence.issues.length) return ["Observed session provenance failed validation"];
    for (const observed of evidence.observedModels) {
      if (
        !isRecord(observed) ||
        typeof observed.messageId !== "string" ||
        observed.providerID !== "openai" ||
        observed.id !== "gpt-6.1-sol" ||
        observed.variant !== "medium"
      )
        return ["Observed assistant model mismatch"];
    }
    return [];
  } catch {
    return ["Private provenance receipt unavailable"];
  }
}

export function schedule(seed: string, caseIds: string[], conditionIds: string[]): ArenaMatch[] {
  const matches: ArenaMatch[] = [];
  for (const caseId of caseIds) {
    for (let left = 0; left < conditionIds.length; left++) {
      for (let right = left + 1; right < conditionIds.length; right++) {
        const first = conditionIds[left];
        const second = conditionIds[right];
        if (!first || !second) throw new Error("Missing schedule condition");
        const reverse = (right - left + conditionIds.length) % conditionIds.length > 2;
        let leftCondition = first;
        let rightCondition = second;
        if (reverse) {
          leftCondition = second;
          rightCondition = first;
        }
        matches.push({
          id: opaque(`${seed}:match:${caseId}:${first}:${second}`),
          caseId,
          leftId: opaque(`${seed}:candidate:${leftCondition}:${caseId}`),
          rightId: opaque(`${seed}:candidate:${rightCondition}:${caseId}`),
        });
      }
    }
  }
  return matches.toSorted((a, b) => hash(`${seed}:${a.id}`).localeCompare(hash(`${seed}:${b.id}`)));
}

async function build(output: string | undefined) {
  const plan = await getPlan();
  if ((await verifyFreeze()) !== plan.freezeHash) throw new Error("Plan freeze mismatch");
  const records: Receipt["records"] = [];
  for (const job of plan.jobs) {
    let raw: string;
    try {
      raw = await readFile(join(durable, "receipts", `${job.id}.raw.txt`), "utf8");
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
      for (const caseId of job.caseIds)
        records.push({
          id: opaque(`${plan.id}:candidate:${job.conditionId}:${caseId}`),
          caseId,
          conditionId: job.conditionId,
          definition: null,
          status: "pending",
          issues: ["First attempt not imported"],
        });
      continue;
    }
    records.push(
      ...applyProvenance(
        validateBatch(raw, job.caseIds, plan.id, job.conditionId).records,
        await receiptProvenance(job.id, raw, plan.freezeHash),
      ),
    );
  }
  const candidates = records.map(({ conditionId: _conditionId, ...candidate }) => ({
    ...candidate,
    issues: candidate.issues.map(() => "First-attempt definition failed validation"),
  }));
  const matches = schedule(
    plan.id,
    createFixtures().map((entry) => entry.id),
    plan.conditions.map((entry) => entry.id),
  );
  const datasetHash = hash(
    json({
      plan: plan.id,
      candidates,
      matches,
      clock: ARENA_CLOCK,
      viewports: ARENA_VIEWPORTS,
      states: ARENA_STATES,
      cases: createFixtures(),
    }),
  );
  const pack: ArenaPrivatePack = {
    datasetHash,
    experiment: {
      id: datasetHash,
      version: 1,
      cases: createFixtures(),
      candidates,
      matches,
      clock: ARENA_CLOCK,
      viewports: ARENA_VIEWPORTS,
      states: ARENA_STATES,
      provenance,
    },
    conditions: plan.conditions.map((condition) => ({
      id: condition.id,
      name: condition.name,
      prompt: condition.prompt,
      sha256: condition.promptHash,
    })),
    candidateConditions: Object.fromEntries(records.map((record) => [record.id, record.conditionId])),
  };
  const path = resolve(
    output ?? join(root, "apps/nextjs/src/app/[locale]/manage/custom-widgets/arena/_generated/pack.json"),
  );
  await put(path, pack);
  console.log(`Wrote server-only pack: ${path}. Private session IDs/raw outputs remain outside pack.`);
}

export function selfcheck() {
  const correct = inspectAssistantModels({
    data: [{ id: "smoke", type: "assistant", model: { providerID: "openai", id: "gpt-6.1-sol", variant: "medium" } }],
  });
  if (correct.models.length !== 1 || correct.issues.length) throw new Error("Model metadata positive control failed");
  if (
    inspectAssistantModels({
      data: [{ id: "smoke", type: "assistant", model: { providerID: "openai", id: "gpt-6.1-sol", variant: "high" } }],
    }).issues.length === 0
  )
    throw new Error("Wrong model variant admitted");
  if (inspectAssistantModels({ data: [{ id: "smoke", type: "assistant" }] }).issues.length === 0)
    throw new Error("Missing model metadata admitted");
  if (arenaTemplateAdmission('<Image src="https://example.com/image.png" />').length === 0)
    throw new Error("External image admitted");
  if (arenaTemplateAdmission('<Anchor href="/manage">Leave</Anchor>').length === 0)
    throw new Error("Navigation admitted");
  if (arenaTemplateAdmission("<Image src={row.image} />").length !== 0) throw new Error("Fixture image rejected");
  if (arenaTemplateAdmission('<Image src="/images/demo-dashboard-background.svg" />').length !== 0)
    throw new Error("Known placeholder rejected");
  const fixtures = createFixtures();
  const conditions = ["a", "b", "c", "d", "e"];
  const pairs = schedule(
    "smoke-only-not-model-output",
    fixtures.map((entry) => entry.id),
    conditions,
  );
  if (pairs.length !== 120 || new Set(pairs.map((entry) => entry.id)).size !== 120)
    throw new Error("Schedule count/identity failed");
  for (const fixture of fixtures) {
    const subset = pairs.filter((entry) => entry.caseId === fixture.id);
    if (subset.length !== 10) throw new Error("Same-case pair count failed");
    for (const condition of conditions) {
      const candidateId = opaque(`smoke-only-not-model-output:candidate:${condition}:${fixture.id}`);
      if (
        subset.filter((entry) => entry.leftId === candidateId).length !== 2 ||
        subset.filter((entry) => entry.rightId === candidateId).length !== 2
      )
        throw new Error("Left/right balance failed");
    }
    const good = json([{ caseId: fixture.id, definition: fixture.definition }]);
    const provenanceFailure = applyProvenance(validateBatch(good, [fixture.id], "smoke", "a").records, [
      "Observed model mismatch",
    ]);
    if (provenanceFailure[0]?.status !== "invalid" || provenanceFailure[0]?.definition !== null)
      throw new Error("Provenance failure was not retained as invalid coverage");
    if (validateBatch(good, [fixture.id], "smoke", "a").records[0]?.status !== "ready")
      throw new Error(`Base validation failed: ${fixture.id}`);
    const bad = json([{ caseId: fixture.id, definition: { ...fixture.definition, name: "changed" } }]);
    if (validateBatch(bad, [fixture.id], "smoke", "a").records[0]?.status !== "invalid")
      throw new Error("Identity mutation accepted");
    if (validateBatch(`\`\`\`json\n${good}\`\`\``, [fixture.id], "smoke", "a").records[0]?.status !== "invalid")
      throw new Error("Markdown accepted");
    if (
      validateBatch(
        json([{ caseId: fixture.id, definition: { ...fixture.definition, template: "<div>raw</div>" } }]),
        [fixture.id],
        "smoke",
        "a",
      ).records[0]?.status !== "invalid"
    )
      throw new Error("Raw HTML accepted");
  }
  console.log(
    "Smoke only: 12 base schemas, JSON/identity/HTML guards, 120 same-case pairs and exact 2-left/2-right balance passed. No model artifacts written.",
  );
}

if (import.meta.main) {
  const [command, ...args] = process.argv.slice(2);
  if (command === "freeze") await freeze();
  else if (command === "prepare") await prepare(args);
  else if (command === "import") await importBatch(args[0], args[1], args[2]);
  else if (command === "build") await build(args[0]);
  else if (command === "--smoke") selfcheck();
  else if (command === "--check-session") {
    const evidence = await observeSession(args[0] ?? "");
    console.log(
      json({
        observedAssistantMessages: evidence.observedModels.length,
        responsePages: evidence.responseHashes.length,
        issues: evidence.issues,
      }),
    );
    if (evidence.issues.length) process.exitCode = 1;
  } else
    throw new Error(
      "Usage: bun tools/widget-arena/harness.ts freeze|prepare PROMPT×5|import JOB RAW SESSION|build [OUTPUT]|--smoke",
    );
}
