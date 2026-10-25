import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { SanityReport } from "../../packages/boards/src/sanity-report.ts";
import { scenarios } from "./fixtures.mts";

const all = scenarios.map((scenario) => scenario.id);
const mappings = [
  {
    match: /^(apps\/nextjs\/src\/(components\/board|app\/\[locale\]\/boards)|packages\/boards\/)/,
    reason: "Board rendering or editing",
    scenarios: all,
  },
  {
    match: /^packages\/(api\/src\/router\/board|db\/|validation\/src\/(board|shared))/,
    reason: "Board persistence and fixture schema",
    scenarios: all,
  },
  {
    match:
      /^(packages\/(ui|settings|translation)\/|apps\/nextjs\/src\/(components\/layout|app\/\[locale\]\/(layout|_client-providers)|app\/providers|providers|styles))/,
    reason: "Shared theme, translations, or provider dependency",
    scenarios: all,
  },
  { match: /^packages\/auth\//, reason: "Seeded-session access and board authorization", scenarios: all },
  {
    match: /^packages\/widgets\/src\/(clock|widget|shared|registry|manifest)/,
    reason: "Representative fixture widget or shared widget runtime",
    scenarios: all,
  },
  {
    match:
      /^(scripts\/sanity\/|e2e\/shared\/|e2e\/board-sanity|\.github\/workflows\/.*sanity|tooling\/github\/setup|\.github\/workflows\/(ci|deployment-docker-image)\.yml$|Dockerfile|package\.json$|bun\.lock$|mise\.toml$)/,
    reason: "Sanity harness or runtime dependency",
    scenarios: all,
  },
];
export interface CoverageDecision {
  path: string;
  blobSha: string;
  reason: string;
  scenarios: string[];
}

const noBrowserImpact =
  /^(docs\/|apps\/docs\/|\.agents\/|\.claude\/|README|CHANGELOG\.md$|AGENTS\.md$|GLOSSARY\.md$|LICENSE|\.github\/(ISSUE_TEMPLATE|PULL_REQUEST_TEMPLATE)\/)/;

export function resolveSource(ref: string): string {
  return execFileSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], { encoding: "utf8" }).trim();
}

export function selectPaths(
  paths: string[],
  additions: string[] = [],
  decisions: CoverageDecision[] = [],
  headBlobs: ReadonlyMap<string, string> = new Map(),
): Omit<SanityReport["selection"], "baseSha" | "headSha"> {
  const selected = new Map<string, Set<string>>();
  const unmappedPaths: string[] = [];
  const add = (id: string, reason: string) => {
    const reasons = selected.get(id) ?? new Set<string>();
    reasons.add(reason);
    selected.set(id, reasons);
  };
  const changedPaths = new Set(paths);
  const coverageDecisions = decisions.filter(
    (decision) => changedPaths.has(decision.path) && decision.blobSha === headBlobs.get(decision.path),
  );
  if (new Set(coverageDecisions.map((decision) => decision.path)).size !== coverageDecisions.length)
    throw new Error("Duplicate coverage decision");
  for (const decision of coverageDecisions) {
    if (!decision.reason.trim() || decision.reason.length > 4096)
      throw new Error("Coverage decisions need a concrete reason");
    for (const id of decision.scenarios) {
      if (!all.includes(id as (typeof all)[number])) throw new Error(`Unknown coverage scenario: ${id}`);
      add(id, `${decision.reason}: ${decision.path}`);
    }
  }
  for (const path of [...changedPaths].toSorted()) {
    const matches = mappings.filter((mapping) => mapping.match.test(path));
    if (
      matches.length === 0 &&
      !noBrowserImpact.test(path) &&
      !coverageDecisions.some((decision) => decision.path === path)
    )
      unmappedPaths.push(path);
    for (const mapping of matches) for (const id of mapping.scenarios) add(id, `${mapping.reason}: ${path}`);
  }
  for (const id of additions) {
    if (!all.includes(id as (typeof all)[number])) throw new Error(`Unknown additional scenario: ${id}`);
    add(id, "Explicit additional scenario");
  }
  return {
    scenarios: [...selected].map(([id, reasons]) => ({ id, reasons: [...reasons] })),
    unmappedPaths,
    coverageDecisions,
  };
}

export function selectChanges(
  baseRef: string,
  headRef: string,
  additions: string[] = [],
  decisions: CoverageDecision[] = [],
): SanityReport["selection"] {
  const baseSha = resolveSource(baseRef);
  const headSha = resolveSource(headRef);
  // --no-renames includes both the deleted source and added destination in coverage decisions.
  const paths = execFileSync("git", ["diff", "--name-only", "--no-renames", "-z", baseSha, headSha], {
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  const headBlobs = new Map(paths.map((path) => [path, "deleted"]));
  const tree = execFileSync("git", ["ls-tree", "-r", "-z", headSha], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  for (const entry of tree.split("\0")) {
    const tab = entry.indexOf("\t");
    if (tab < 0) continue;
    const path = entry.slice(tab + 1);
    const blob = entry.slice(0, tab).split(" ")[2];
    if (blob && headBlobs.has(path)) headBlobs.set(path, blob);
  }
  return { baseSha, headSha, ...selectPaths(paths, additions, decisions, headBlobs) };
}

function value(flag: string): string {
  const index = process.argv.indexOf(flag);
  const result = process.argv[index + 1];
  if (index < 0 || !result) throw new Error(`Missing ${flag}`);
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = value("--base");
  const head = value("--head");
  if (!process.argv.includes("--base") || !process.argv.includes("--head") || !base || !head)
    throw new Error("Usage: select.mts --base REF --head REF [--output FILE]");
  const decisions = process.argv.includes("--coverage-decisions")
    ? (JSON.parse(readFileSync(value("--coverage-decisions"), "utf8")) as CoverageDecision[])
    : [];
  const selection = selectChanges(base, head, [], decisions);
  const output = `${JSON.stringify(selection, null, 2)}\n`;
  if (process.argv.includes("--output")) writeFileSync(value("--output"), output);
  else process.stdout.write(output);
  if (selection.unmappedPaths.length > 0) process.exitCode = 2;
}
