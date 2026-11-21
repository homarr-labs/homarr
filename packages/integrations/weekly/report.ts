import { appendFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { integrationKinds } from "@homarr/definitions";

import { assertCompleteRegistry, executableProfiles, profiles } from "./profiles";

export interface Provenance {
  image: string;
  imageId: string;
  repoDigests: string[];
}
declare module "vitest" {
  interface TaskMeta {
    provenance?: Provenance | null;
  }
}
export interface Outcome {
  id: string;
  status: "pass" | "fail";
  provenance: Provenance | null;
}

function readOutcomes(stored: unknown): Outcome[] {
  if (!Array.isArray(stored)) return [];
  return executableProfiles.flatMap((profile) => {
    const entry: unknown = stored.find(
      (value: unknown) => typeof value === "object" && value !== null && "id" in value && value.id === profile.id,
    );
    if (typeof entry !== "object" || entry === null || !("status" in entry) || !("provenance" in entry)) return [];
    const provenance = sanitizeProvenance(entry.provenance);
    let status: Outcome["status"] = "fail";
    if (entry.status === "pass" && provenance?.image === profile.image) status = "pass";
    return [{ id: profile.id, status, provenance }];
  });
}

export const reportDirectory = process.env.LIVE_REPORT_DIR ?? "coverage/weekly-integrations";
const imagePattern = /^[a-z0-9][a-z0-9./:_-]{0,240}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const repoDigestPattern = /^[a-z0-9][a-z0-9./:_-]{0,240}@sha256:[a-f0-9]{64}$/;

export function sanitizeProvenance(value: unknown): Provenance | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("image" in value) || typeof value.image !== "string" || !imagePattern.test(value.image)) return null;
  if (!("imageId" in value) || typeof value.imageId !== "string" || !digestPattern.test(value.imageId)) return null;
  if (!("repoDigests" in value) || !Array.isArray(value.repoDigests)) return null;
  const repoDigests = value.repoDigests.filter(
    (digest): digest is string => typeof digest === "string" && repoDigestPattern.test(digest),
  );
  if (repoDigests.length === 0 || repoDigests.length !== value.repoDigests.length) return null;
  return { image: value.image, imageId: value.imageId, repoDigests };
}

export async function writeReport(outcomes: Outcome[]) {
  assertCompleteRegistry();
  const rows = integrationKinds.map((kind) => {
    const profile = profiles[kind];
    if (profile.status !== "runnable") {
      return { kind, status: profile.status, reason: profile.reason, evidence: profile.evidence, profiles: [] };
    }
    const attempts = executableProfiles
      .filter((entry) => entry.kind === kind)
      .map((entry) => {
        const outcome = outcomes.find((result) => result.id === entry.id);
        let status = "not-run";
        if (entry.id === process.env.LIVE_PROFILE) status = "fail";
        if (outcome) status = outcome.status;
        return {
          id: entry.id,
          status,
          image: entry.image,
          assertion: entry.assertion,
          provenance: outcome?.provenance ?? null,
        };
      });
    let status = "not-run";
    if (attempts.some((entry) => entry.status === "fail")) status = "fail";
    else if (attempts.every((entry) => entry.status === "pass")) status = "pass";
    else if (attempts.some((entry) => entry.status === "pass")) status = "partial";
    return {
      kind,
      status,
      reason: profile.assertion,
      evidence: "packages/integrations/weekly/adapters.ts",
      profiles: attempts,
    };
  });
  const summary = [
    "## Latest peer images × current Homarr source adapters",
    "",
    "Not a test of the latest published Homarr image. Blocked, unsupported, partial and not-run are not passes.",
    "Fresh Setup fixtures only. Fixture caches are disabled until safe restore/relocation is proven. No private Project artifacts are exported.",
    "",
    "| Integration kind | Result | Assertions / limitation | Source |",
    "| --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.kind} | ${row.status} | ${row.reason} | ${row.evidence} |`),
    "",
    "### Executable profiles",
    "",
    ...rows.flatMap((row) =>
      row.profiles.flatMap((entry) => {
        const lines = [`- ${entry.id}: **${entry.status}** — \`${entry.image}\``];
        if (entry.provenance)
          lines.push(
            `  - Image ID: \`${entry.provenance.imageId}\``,
            ...entry.provenance.repoDigests.map((digest) => `  - Repo digest: \`${digest}\``),
          );
        return lines;
      }),
    ),
    "",
  ].join("\n");
  const cases = rows.flatMap((row) => {
    if (row.profiles.length === 0)
      return [`<testcase name="${row.kind}"><skipped message="${row.status}"/></testcase>`];
    return row.profiles.map((entry) => {
      if (entry.status === "pass") return `<testcase name="${entry.id}"/>`;
      if (entry.status === "fail")
        return `<testcase name="${entry.id}"><failure message="Live profile or cleanup failed; private diagnostics withheld"/></testcase>`;
      return `<testcase name="${entry.id}"><skipped message="not-run"/></testcase>`;
    });
  });
  const failures = rows.flatMap((row) => row.profiles).filter((entry) => entry.status === "fail").length;
  const skipped = cases.filter((entry) => entry.includes("<skipped")).length;
  await mkdir(reportDirectory, { recursive: true });
  await writeFile(
    path.join(reportDirectory, "checklist.json"),
    JSON.stringify({ source: "current-checkout", rows }, null, 2),
  );
  await writeFile(path.join(reportDirectory, "checklist.md"), summary);
  await writeFile(
    path.join(reportDirectory, "junit.xml"),
    `<testsuites><testsuite name="latest-peers-current-source" tests="${cases.length}" failures="${failures}" skipped="${skipped}">${cases.join("")}</testsuite></testsuites>\n`,
  );
  await writeFile(path.join(reportDirectory, "outcomes.json"), JSON.stringify(outcomes, null, 2));
}

export async function finalizeReport() {
  let outcomes: Outcome[] = [];
  let unreadable = false;
  try {
    const stored: unknown = JSON.parse(await readFile(path.join(reportDirectory, "outcomes.json"), "utf8"));
    outcomes = readOutcomes(stored);
  } catch (error) {
    unreadable = !(error instanceof Error && "code" in error && error.code === "ENOENT");
  }
  if (unreadable) throw new Error("Unable to read sanitized live outcomes");
  if (
    process.env.LIVE_PROFILE &&
    (process.env.LIVE_TEST_OUTCOME !== "success" || process.env.LIVE_CLEANUP_OUTCOME !== "success")
  ) {
    const current = outcomes.find((outcome) => outcome.id === process.env.LIVE_PROFILE);
    if (current) current.status = "fail";
    else outcomes.push({ id: process.env.LIVE_PROFILE, status: "fail", provenance: null });
  }
  await writeReport(outcomes);
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      await readFile(path.join(reportDirectory, "checklist.md"), "utf8"),
    );
  if (
    process.env.LIVE_PROFILE &&
    !outcomes.some((entry) => entry.id === process.env.LIVE_PROFILE && entry.status === "pass")
  )
    throw new Error("Selected live profile did not pass assertions and cleanup");
}

export async function aggregateReport() {
  const outcomes: Outcome[] = [];
  const directory = process.env.LIVE_MERGE_DIR ?? "coverage/weekly-merged";
  let entries: string[] = [];
  try {
    entries = await readdir(directory);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  for (const profile of executableProfiles) {
    const artifact = `live-integration-${profile.id}`;
    if (!entries.includes(artifact)) {
      outcomes.push({ id: profile.id, status: "fail", provenance: null });
      continue;
    }
    let result: Outcome | undefined;
    try {
      const stored: unknown = JSON.parse(await readFile(path.join(directory, artifact, "outcomes.json"), "utf8"));
      result = readOutcomes(stored).find((entry) => entry.id === profile.id);
    } catch {
      result = undefined;
    }
    outcomes.push(result ?? { id: profile.id, status: "fail", provenance: null });
  }
  await writeReport(outcomes);
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      await readFile(path.join(reportDirectory, "checklist.md"), "utf8"),
    );
  if (outcomes.some((entry) => entry.status !== "pass"))
    throw new Error("One or more live profiles failed or produced no sanitized result");
}
