import { readFile } from "node:fs/promises";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "..");
const CODEOWNERS_PATH = join(REPO_ROOT, "CODEOWNERS");

const BEGIN_MARKER = "# BEGIN GENERATED widget/integration owners";
const END_MARKER = "# END GENERATED widget/integration owners";

const UNSUPPORTED_PATTERN_CHECKS: { label: string; pattern: RegExp }[] = [
  { label: "negation (!)", pattern: /^\s*!/ },
  { label: "character range ([ ])", pattern: /^\s*[^#]*\[[^\]]+\]/ },
];

const parseOwners = (line: string) => [...line.matchAll(/@[\w-]+(?:\/[\w-]+)?/g)].map((match) => match[0]);

const parsePatterns = (line: string) => {
  const withoutOwners = line.replace(/@[\w-]+(?:\/[\w-]+)?/g, "").trim();
  return withoutOwners.split(/\s+/).filter((token) => token.length > 0 && !token.startsWith("#"));
};

const validateLine = (line: string, lineNumber: number) => {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith("#")) return [];

  const errors: string[] = [];

  for (const check of UNSUPPORTED_PATTERN_CHECKS) {
    if (check.pattern.test(line)) {
      errors.push(`line ${lineNumber}: unsupported CODEOWNERS syntax (${check.label})`);
    }
  }

  const owners = parseOwners(line);
  const patterns = parsePatterns(line);

  if (patterns.length === 0 && owners.length === 0) return errors;

  if (patterns.length > 0 && owners.length === 0) return errors;

  if (owners.length > 0 && patterns.length === 0) {
    errors.push(`line ${lineNumber}: owners without file patterns`);
  }

  for (const pattern of patterns) {
    const allowedGlobal = pattern === "*";
    const hasValidShape =
      allowedGlobal || pattern.startsWith("/") || pattern.includes("*") || pattern.includes(".");
    if (!hasValidShape) {
      errors.push(`line ${lineNumber}: pattern "${pattern}" should start with / or contain a wildcard`);
    }
  }

  for (const owner of owners) {
    if (!owner.startsWith("@")) {
      errors.push(`line ${lineNumber}: invalid owner "${owner}"`);
    }
  }

  return errors;
};

const validateStructure = (content: string) => {
  const errors: string[] = [];
  const lines = content.split("\n");

  if (!content.includes("* @")) {
    errors.push("missing default owner rule (* @team or * @user) — last matching pattern wins per GitHub docs");
  }

  const starIndex = lines.findIndex((line) => /^\*(\s+|$)/.test(line.trim()));
  const beginIndex = lines.findIndex((line) => line.includes(BEGIN_MARKER));
  const endIndex = lines.findIndex((line) => line.includes(END_MARKER));

  if (beginIndex === -1 || endIndex === -1) {
    errors.push("missing generated CODEOWNERS markers");
    return errors;
  }

  if (starIndex !== -1 && beginIndex !== -1 && starIndex > beginIndex) {
    errors.push("global * rule must appear before generated feature rules so per-folder owners override maintainers");
  }

  if (endIndex <= beginIndex) {
    errors.push("END GENERATED marker must follow BEGIN GENERATED marker");
  }

  for (let index = 0; index < lines.length; index += 1) {
    const lineErrors = validateLine(lines[index] ?? "", index + 1);
    errors.push(...lineErrors);
  }

  return errors;
};

const validateGithubApi = async () => {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY ?? "homarr-labs/homarr";

  if (!token) {
    console.warn("Skipping GitHub API CODEOWNERS check (GITHUB_TOKEN not set).");
    return;
  }

  const response = await fetch(`https://api.github.com/repos/${repository}/codeowners/errors`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API codeowners/errors failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as { errors: unknown[] };
  const apiErrors = payload.errors ?? [];

  if (apiErrors.length > 0) {
    console.error("GitHub reported CODEOWNERS syntax errors:");
    console.error(JSON.stringify(apiErrors, null, 2));
    process.exit(1);
  }

  console.log("GitHub API: no CODEOWNERS syntax errors.");
};

const main = async () => {
  const content = await readFile(CODEOWNERS_PATH, "utf8");
  const errors = validateStructure(content);

  if (errors.length > 0) {
    console.error("CODEOWNERS validation failed:");
    for (const error of errors) {
      console.error(`  ${error}`);
    }
    process.exit(1);
  }

  console.log("CODEOWNERS structure validation passed.");
  await validateGithubApi();
};

await main();
