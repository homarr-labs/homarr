import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "..");
const CODEOWNERS_PATH = join(REPO_ROOT, "CODEOWNERS");
const OVERRIDES_PATH = join(REPO_ROOT, "scripts/codeowners-overrides.json");

const BEGIN_MARKER = "# BEGIN GENERATED widget/integration owners";
const END_MARKER = "# END GENERATED widget/integration owners";

const WIDGET_SKIP = new Set(["_inputs", "errors", "modals", "test"]);
const INTEGRATION_SKIP = new Set(["base", "interfaces", "mock"]);

const BOT_SUBSTRINGS = ["[bot]", "renovate", "homarr-update", "dependabot", "github-actions"];

const WIDGET_ROUTER_ALIASES: Record<string, string> = {
  "anchor-note": "anchor-notes",
  "media-releases": "media-release",
  rssFeed: "rssFeed",
  stocks: "stocks",
};

const INTEGRATION_CRON_ALIASES: Record<string, string> = {
  homeassistant: "home-assistant",
  "download-client": "downloads",
  "media-organizer": "media-organizer",
  "pi-hole": "dns-hole",
  "smart-home": "home-assistant",
};

const WIDGET_TO_INTEGRATION_DIR: Record<string, string> = {
  "anchor-note": "anchor",
};

const NESTED_WIDGET_ROUTER_PARENT: Record<string, string> = {
  "dns-hole": "dns-hole",
  immich: "immich",
  "media-requests": "media-requests",
  "network-controller": "network-controller",
  minecraft: "minecraft",
  "smart-home": "smart-home",
};

type Overrides = Record<string, string>;

const isBotEmail = (email: string) => BOT_SUBSTRINGS.some((fragment) => email.toLowerCase().includes(fragment));

const gitEmailForPath = (repoPath: string) => {
  const strategies = [
    ["log", "--grep=feat", "-i", "--format=%ae", "--reverse", "-1", "--", repoPath],
    ["log", "--diff-filter=A", "--format=%ae", "--reverse", "-1", "--", repoPath],
    ["log", "--format=%ae", "--reverse", "-1", "--", repoPath],
  ] as const;

  for (const args of strategies) {
    const result = spawnSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
    const email = (result.stdout ?? "").trim();
    if (email && !isBotEmail(email)) return email;
  }
  return "";
};

const noreplyHandle = (email: string) => {
  const match = email.match(/^\d+\+([^@]+)@users\.noreply\.github\.com$/i);
  return match?.[1] ?? null;
};

const resolveHandle = (email: string, overrides: Overrides) => {
  const fromNoreply = noreplyHandle(email);
  if (fromNoreply) return fromNoreply;
  return overrides[email] ?? null;
};

const hasLeafMarker = (dirPath: string) => {
  const names = readdirSync(dirPath);
  const leafPatterns = ["-integration.ts", "component.tsx", "index.ts", "index.tsx"];
  return names.some((name) => leafPatterns.some((suffix) => name.endsWith(suffix) || name === suffix));
};

const discoverLeafDirs = (base: string, skip: Set<string>) => {
  const absoluteBase = join(REPO_ROOT, base);
  const leaves: string[] = [];

  for (const name of readdirSync(absoluteBase).sort()) {
    const dirPath = join(absoluteBase, name);
    if (!statSync(dirPath).isDirectory() || skip.has(name)) continue;

    if (hasLeafMarker(dirPath)) {
      leaves.push(join(base, name));
      continue;
    }

    const nestedLeaves = readdirSync(dirPath)
      .filter((sub) => statSync(join(dirPath, sub)).isDirectory())
      .filter((sub) => hasLeafMarker(join(dirPath, sub)))
      .map((sub) => join(base, name, sub));

    leaves.push(...(nestedLeaves.length > 0 ? nestedLeaves : [join(base, name)]));
  }

  return leaves;
};

const relFromBase = (fullPath: string, base: string) => relative(join(REPO_ROOT, base), join(REPO_ROOT, fullPath));

const widgetRouterKey = (widgetRel: string) => {
  const direct = WIDGET_ROUTER_ALIASES[widgetRel];
  if (direct) return direct;

  const segment = widgetRel.includes("/") ? (widgetRel.split("/")[0] ?? widgetRel) : widgetRel;
  const parentAlias = NESTED_WIDGET_ROUTER_PARENT[segment];
  const segmentAlias = WIDGET_ROUTER_ALIASES[segment];
  return parentAlias ?? segmentAlias ?? segment;
};

const integrationCronKey = (integrationRel: string) => {
  const segment = integrationRel.includes("/") ? (integrationRel.split("/")[0] ?? integrationRel) : integrationRel;
  return INTEGRATION_CRON_ALIASES[segment] ?? INTEGRATION_CRON_ALIASES[integrationRel] ?? segment;
};

const existingFile = (repoPath: string) => {
  const full = join(REPO_ROOT, repoPath);
  return existsSync(full) ? `/${repoPath}` : null;
};

const widgetSatellites = (widgetRel: string) => {
  const routerKey = widgetRouterKey(widgetRel);
  const cronKey = integrationCronKey(widgetRel);
  return [
    existingFile(`packages/api/src/router/widgets/${routerKey}.ts`),
    existingFile(`packages/cron-jobs/src/jobs/integrations/${cronKey}.ts`),
    existingFile(`packages/cron-jobs/src/jobs/${cronKey}.ts`),
  ].filter((path): path is string => path !== null);
};

const integrationSatellites = (integrationRel: string) => {
  const cronKey = integrationCronKey(integrationRel);
  return [
    existingFile(`packages/cron-jobs/src/jobs/integrations/${cronKey}.ts`),
    existingFile(`packages/cron-jobs/src/jobs/${cronKey}.ts`),
  ].filter((path): path is string => path !== null);
};

const dirCodeownersPath = (repoDir: string) => `/${repoDir}/`;

const integrationRelForWidget = (widgetRel: string) => {
  const mapped = WIDGET_TO_INTEGRATION_DIR[widgetRel] ?? WIDGET_TO_INTEGRATION_DIR[widgetRel.split("/")[0] ?? ""];
  if (mapped) return mapped;

  const direct = join("packages/integrations/src", widgetRel);
  if (existsSync(join(REPO_ROOT, direct))) return widgetRel;

  const segment = widgetRel.split("/")[0] ?? widgetRel;
  const segmentPath = join("packages/integrations/src", segment);
  if (existsSync(join(REPO_ROOT, segmentPath))) return segment;

  return null;
};

const collectPathsForWidget = (widgetRel: string) => {
  const paths = new Set<string>([dirCodeownersPath(`packages/widgets/src/${widgetRel}`), ...widgetSatellites(widgetRel)]);

  const integrationRel = integrationRelForWidget(widgetRel);
  if (integrationRel) {
    paths.add(dirCodeownersPath(`packages/integrations/src/${integrationRel}`));
    for (const satellite of integrationSatellites(integrationRel)) paths.add(satellite);
  }

  return [...paths];
};

const collectPathsForIntegration = (integrationRel: string) => {
  const paths = new Set<string>([
    dirCodeownersPath(`packages/integrations/src/${integrationRel}`),
    ...integrationSatellites(integrationRel),
  ]);

  const widgetPath = join(REPO_ROOT, "packages/widgets/src", integrationRel);
  if (existsSync(widgetPath)) {
    paths.add(dirCodeownersPath(`packages/widgets/src/${integrationRel}`));
    for (const satellite of widgetSatellites(integrationRel)) paths.add(satellite);
  }

  return [...paths];
};

const loadOverrides = async () => JSON.parse(await readFile(OVERRIDES_PATH, "utf8")) as Overrides;

const resolveGithubUser = async (email: string, overrides: Overrides) => {
  const fromOverrides = resolveHandle(email, overrides);
  if (fromOverrides) return fromOverrides;

  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;

  const response = await fetch(`https://api.github.com/search/users?q=${encodeURIComponent(email)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { items: { login: string }[] };
  return data.items[0]?.login ?? null;
};

type OwnerEntry = { primary: string; line: string };

const buildOwnerEntries = async (overrides: Overrides) => {
  const entries: OwnerEntry[] = [];
  const unresolved: { path: string; email: string }[] = [];
  const claimedDirs = new Set<string>();

  const addUnit = async (repoDir: string, collectPaths: (rel: string) => string[]) => {
    if (claimedDirs.has(repoDir)) return;

    const rel =
      repoDir.startsWith("packages/widgets/") ?
        relFromBase(repoDir, "packages/widgets/src")
      : relFromBase(repoDir, "packages/integrations/src");

    const email = gitEmailForPath(`${repoDir}/`);
    if (!email) {
      unresolved.push({ path: repoDir, email: "" });
      return;
    }

    const handle = await resolveGithubUser(email, overrides);
    if (!handle) {
      unresolved.push({ path: repoDir, email });
      return;
    }

    const paths = collectPaths(rel).sort();
    const primary = paths[0] ?? `/${repoDir}/`;
    entries.push({ primary, line: `${paths.join(" ")} @${handle}` });

    claimedDirs.add(repoDir);
    for (const path of paths) {
      if (!path.endsWith("/")) continue;
      claimedDirs.add(path.slice(1, -1));
    }
  };

  for (const widgetDir of discoverLeafDirs("packages/widgets/src", WIDGET_SKIP)) {
    await addUnit(widgetDir, collectPathsForWidget);
  }

  for (const integrationDir of discoverLeafDirs("packages/integrations/src", INTEGRATION_SKIP)) {
    await addUnit(integrationDir, collectPathsForIntegration);
  }

  entries.sort((a, b) => a.primary.localeCompare(b.primary));
  return { entries, unresolved };
};

const formatGeneratedBlock = (entries: OwnerEntry[]) => {
  const lines = entries.map((entry) => entry.line);
  return [BEGIN_MARKER, ...lines, END_MARKER].join("\n");
};

const replaceGeneratedSection = (content: string, generatedBlock: string) => {
  const startIndex = content.indexOf(BEGIN_MARKER);
  const endIndex = content.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1) {
    return `${content.trimEnd()}\n\n${generatedBlock}\n`;
  }

  const before = content.slice(0, startIndex).trimEnd();
  const after = content.slice(endIndex + END_MARKER.length).trimStart();
  const middle = generatedBlock;
  const chunks = [before, middle, after].filter((chunk) => chunk.length > 0);
  return `${chunks.join("\n\n")}\n`;
};

const main = async () => {
  const overrides = await loadOverrides();
  const { entries, unresolved } = await buildOwnerEntries(overrides);
  const generatedBlock = formatGeneratedBlock(entries);

  const current = await readFile(CODEOWNERS_PATH, "utf8");
  const next = replaceGeneratedSection(current, generatedBlock);

  const checkOnly = process.argv.includes("--check");

  if (unresolved.length > 0) {
    console.warn("Unresolved ownership units (add to scripts/codeowners-overrides.json):");
    for (const entry of unresolved) console.warn(`  ${entry.path} (${entry.email || "no email"})`);
  }

  if (checkOnly) {
    if (next !== current) {
      console.error("CODEOWNERS is out of date. Run: pnpm scripts:generate-codeowners");
      process.exit(1);
    }
    return;
  }

  await writeFile(CODEOWNERS_PATH, next, "utf8");
  console.log(`Updated CODEOWNERS with ${entries.length} feature units.`);
};

await main();
