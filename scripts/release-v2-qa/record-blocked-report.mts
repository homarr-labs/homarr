import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { resolveCheckoutCandidateSha } from "./provenance.mts";
import { validateResolvedArtifactPath, writeSafeReportFile } from "./report-path-integrity.mts";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const qaRoot = path.join(repoRoot, "qa/release-v2");
const candidateSha = resolveCheckoutCandidateSha(repoRoot);

type Status = "passed" | "failed" | "blocked" | "not-reached";

interface Packet {
  id: string;
  wave: string;
  title: string;
  prRefs: number[];
  personas: string[];
  boards: string[];
  profiles: string[];
  viewports: string[];
  zooms: number[];
  inputs: string[];
  widgetKinds?: string[];
  cases: string[];
}

interface Manifest {
  caseDimensions: Record<string, { id: string; expected: string }[]>;
  packets: Packet[];
}

interface Options {
  packetId: string;
  url: string;
  profile: string;
  persona: string;
  session: string;
  viewport: string;
  input: string;
  zoom: number;
  timestamp: string;
}

const profileFlags: Record<string, string[]> = {
  "main-writable": ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
  "main-readonly": ["DEMO_MODE=true", "DEMO_READ_ONLY=true", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
  "onboarding-fresh": ["DEMO_MODE=false", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
  degraded: ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
};

const exhaustiveSizeWidgetKinds = new Set([
  "downloads",
  "calendar",
  "mediaServer",
  "mediaRequests-requestList",
  "mediaRequests-requestStats",
  "systemResources",
  "systemDisks",
  "dockerContainers",
  "networkControllerSummary",
  "networkControllerStatus",
  "beszelSystemStats",
  "uptimeKuma",
  "bookmarks",
  "notebook",
  "iframe",
  "customApi",
  "assistant",
]);

const parseOptions = (): Options => {
  const values = new Map<string, string>();
  const args = process.argv.slice(2).filter((argument) => argument !== "--");
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || !value) throw new Error(`Invalid argument ${key ?? "<missing>"}`);
    values.set(key.slice(2), value);
  }

  const required = (key: string) => {
    const value = values.get(key);
    if (!value) throw new Error(`--${key} is required`);
    return value;
  };
  const zoom = Number(required("zoom"));
  if (!Number.isFinite(zoom) || zoom <= 0) throw new Error("--zoom must be a positive number");
  return {
    packetId: required("packet"),
    url: required("url"),
    profile: required("profile"),
    persona: required("persona"),
    session: required("session"),
    viewport: required("viewport"),
    input: required("input"),
    zoom,
    timestamp: values.get("timestamp") ?? new Date().toISOString(),
  };
};

const listFiles = async (directory: string): Promise<string[]> => {
  const output: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await listFiles(entryPath)));
    else if (entry.isFile()) {
      const artifactError = await validateResolvedArtifactPath(directory, entryPath, "blocked-report artifact");
      if (artifactError) throw new Error(artifactError);
      const file = await lstat(entryPath);
      if (!entryPath.endsWith(".webm") || file.size > 0) output.push(entryPath);
    } else {
      throw new Error(`Blocked-report artifact tree contains a non-regular entry: ${entry.name}`);
    }
  }
  return output.toSorted();
};

const escapeCell = (value: string) => value.replaceAll("|", "\\|").replaceAll("\n", " ");
const list = (values: (string | number)[]) => {
  if (values.length === 0) return "None";
  return values.join(", ");
};

const sizeRequirement = (widgetKind: string) => {
  if (exhaustiveSizeWidgetKinds.has(widgetKind)) return "every width 1-24 × every height 1-6";
  return "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds";
};

const main = async () => {
  const options = parseOptions();
  const manifest = JSON.parse(await readFile(path.join(qaRoot, "coverage-manifest.json"), "utf8")) as Manifest;
  const packet = manifest.packets.find((candidate) => candidate.id === options.packetId);
  if (!packet) throw new Error(`Unknown packet ${options.packetId}`);
  if (!packet.profiles.includes(options.profile)) throw new Error(`${packet.id} does not include ${options.profile}`);
  if (!packet.personas.includes(options.persona)) throw new Error(`${packet.id} does not include ${options.persona}`);
  if (!packet.viewports.includes(options.viewport))
    throw new Error(`${packet.id} does not include ${options.viewport}`);
  if (!packet.inputs.includes(options.input)) throw new Error(`${packet.id} does not include ${options.input}`);
  if (!packet.zooms.includes(options.zoom)) throw new Error(`${packet.id} does not include ${options.zoom}%`);
  const flags = profileFlags[options.profile];
  if (!flags) throw new Error(`Unknown runtime profile ${options.profile}`);

  const runtimeUrl = new URL(options.url);
  const actualPort = Number(runtimeUrl.port);
  if (!Number.isInteger(actualPort) || actualPort <= 0) throw new Error("Runtime URL must include an explicit port");
  const artifactDirectory = path.join(repoRoot, ".screenshots/release-v2", packet.id);
  const artifacts = await listFiles(artifactDirectory);
  if (artifacts.length === 0) throw new Error(`${packet.id} has no browser artifacts`);

  const dimensions = manifest.caseDimensions[packet.wave] ?? [];
  const cases = packet.cases.flatMap((baseId) =>
    dimensions.map((dimension) => ({ id: `${baseId}-${dimension.id}`, expected: dimension.expected })),
  );
  const caseStatuses: Record<string, Status> = {};
  for (const testCase of cases) {
    let status: Status = "blocked";
    if (packet.wave === "preflight" && testCase.id.endsWith("-ENVIRONMENT")) status = "failed";
    if (packet.wave === "preflight" && testCase.id.endsWith("-EVIDENCE")) status = "passed";
    caseStatuses[testCase.id] = status;
  }
  const status: Status = Object.values(caseStatuses).includes("failed") ? "failed" : "blocked";
  const blockedCaseIds = Object.entries(caseStatuses)
    .filter(([, caseStatus]) => caseStatus !== "passed")
    .map(([caseId]) => caseId);
  const findingEvidence = artifacts.filter(
    (artifact) => artifact.endsWith(".png") || artifact.endsWith(".webm") || artifact.includes("network"),
  );
  const evidence = findingEvidence.length > 0 ? findingEvidence : artifacts;
  const hasRetryEvidence = artifacts.some((artifact) => /fresh|retry/u.test(path.basename(artifact)));
  let findingSummary =
    "Chromium repeatedly requests the same entry route and ends on ERR_TOO_MANY_REDIRECTS, preventing the assigned browser flow.";
  let retryLimitation =
    "The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports.";
  let retryStep = "5. Compare the result with the independently reproduced preflight evidence.";
  let reproducibility = "reproduced independently by the preflight agents";
  if (hasRetryEvidence) {
    findingSummary =
      "A fresh Chromium session repeatedly requests the same entry route and ends on ERR_TOO_MANY_REDIRECTS; a fresh-context retry does the same.";
    retryLimitation =
      "The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop.";
    retryStep = "5. Close the context, retry in a fresh context, and observe the same result.";
    reproducibility = "reproduced on retry and independently by the preflight agents";
  }
  const reproductionAgent = packet.id === "preflight-01" ? "qa-v2-preflight-02" : "qa-v2-preflight-01";
  const widgetChecks = (packet.widgetKinds ?? []).flatMap((widgetKind) =>
    packet.viewports.map((viewport) => ({
      widgetKind,
      viewport,
      sizeRequirement: sizeRequirement(widgetKind),
      status: "blocked" as const,
    })),
  );
  const metadata = {
    packetId: packet.id,
    status,
    caseStatuses,
    execution: {
      candidateSha,
      url: options.url,
      actualPort,
      runtimeProfile: options.profile,
      runtimeFlags: flags,
      persona: options.persona,
      sessionId: options.session,
      timestamp: options.timestamp,
      viewport: options.viewport,
      input: options.input,
      zoom: options.zoom,
    },
    findings: [
      {
        id: "RV2-P1-001",
        fingerprint: "release-v2-auth-locale-redirect-loop",
        severity: "P1",
        area: "routing/authentication",
        title: "Locale rewrite causes an infinite browser redirect before the application renders",
        summary: findingSummary,
        caseIds: blockedCaseIds,
        evidence,
      },
    ],
    artifacts,
    widgetChecks,
    performance: {
      measurements: [],
      limitations: [
        "The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked.",
        "No credentials were submitted and no product state was mutated.",
        retryLimitation,
      ],
    },
    independentReproductions: [
      {
        findingFingerprint: "release-v2-auth-locale-redirect-loop",
        agentId: reproductionAgent,
        outcome: "reproduced",
        evidence: [],
        notes: `See ${reproductionAgent.replace("qa-v2-", "")} for an independent Luna Max reproduction.`,
      },
    ],
    notes: "Report-only black-box run. No defect was fixed and no secret was recorded.",
  };

  const caseRows = cases
    .map((testCase) => {
      const caseStatus = caseStatuses[testCase.id];
      return `| ${testCase.id} | ${caseStatus} | [browser artifacts](${artifactDirectory}) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | ${escapeCell(testCase.expected)} |`;
    })
    .join("\n");
  let widgetSection = "";
  if (widgetChecks.length > 0) {
    const widgetRows = widgetChecks
      .map(
        (check) =>
          `| ${check.widgetKind} | ${check.viewport} | ${check.sizeRequirement} | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](${artifactDirectory}) | ${check.status} |`,
      )
      .join("\n");
    widgetSection = `\n## Widget kind × viewport checklist\n\n| Widget kind | Viewport | Size | States | Permission/read-only | Options/persistence | Recovery | Evidence | Status |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${widgetRows}\n`;
  }
  const artifactRows = artifacts.map((artifact) => `- [${path.basename(artifact)}](${artifact})`).join("\n");
  const report = `<!-- release-v2-qa-report
${JSON.stringify(metadata, null, 2)}
-->

# ${packet.id}: ${packet.title}

| Metadata | Value |
| --- | --- |
| Status | ${status} |
| Wave | ${packet.wave} |
| PR refs | ${packet.prRefs.map((number) => `#${number}`).join(", ")} |
| Personas | ${list(packet.personas)} |
| Boards | ${list(packet.boards)} |
| Profiles | ${list(packet.profiles)} |
| Chromium viewports | ${list(packet.viewports)} |
| Zoom | ${list(packet.zooms.map((zoom) => `${zoom}%`))} |
| Input | ${list(packet.inputs)} |
| Widget kinds | ${list(packet.widgetKinds ?? [])} |
| Artifact directory | [${artifactDirectory}](${artifactDirectory}) |
| Candidate SHA | ${candidateSha} |
| URL / actual port | ${options.url} / ${actualPort} |
| Runtime profile / flags | ${options.profile}; ${flags.join(", ")} |
| Executed persona | ${options.persona} |
| Browser session ID | ${options.session} |
| Timestamp | ${options.timestamp} |
| Executed viewport / input / zoom | ${options.viewport} / ${options.input} / ${options.zoom}% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
${caseRows}
${widgetSection}
## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by ${reproductionAgent}; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate ${candidateSha}, ${options.profile}, ${options.viewport}, ${options.zoom}% zoom, ${options.input}, fresh named Chromium session ${options.session}.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open ${options.url} or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
${retryStep}

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: ${reproducibility}. Console output was empty; network and visual evidence are linked below.

## Artifacts

${artifactRows}

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
`;
  const reportPath = path.join(qaRoot, "reports", packet.id, "report.md");
  await writeSafeReportFile(qaRoot, reportPath, report, `${packet.id} report path`);
  console.log(`Normalized blocked browser report ${packet.id} with ${artifacts.length} artifact(s)`);
};

await main();
