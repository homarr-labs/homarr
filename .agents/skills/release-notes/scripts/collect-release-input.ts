import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs, promisify } from "node:util";

import { generateGithubNotes } from "../../../../scripts/release-notes/github-notes.mjs";
import { repositoryRoot } from "../../../../scripts/release-notes/paths.mjs";

const execFileAsync = promisify(execFile);

const graphqlChunkSize = 25;
const maxBodyLength = 3000;
const bodyBudget = 150_000;
const maxImagesPerPullRequest = 6;

interface ImageReference {
  url: string;
  alt: string;
}

interface LinkedIssue {
  number: number;
  title: string;
  url: string;
}

interface PullRequestInput {
  number: number;
  url: string;
  title: string;
  author: string;
  labels: string[];
  mergedAt: string | null;
  body: string;
  images: ImageReference[];
  closes: LinkedIssue[];
}

interface FirstTimeContributor {
  login: string;
  pullRequest: number;
}

interface ReleaseItem {
  kind: "integration" | "widget";
  slug: string;
  name: string;
  description: string;
  iconUrl: string | null;
}

type ReleaseType = "major" | "minor" | "patch";

interface GraphqlPullRequest {
  number: number;
  url: string;
  title: string;
  body: string;
  mergedAt: string | null;
  author: { login: string } | null;
  labels: { nodes: { name: string }[] };
  closingIssuesReferences: { nodes: LinkedIssue[] };
}

const gh = async (args: string[]) => {
  const { stdout } = await execFileAsync("gh", args, { cwd: repositoryRoot, maxBuffer: 64 * 1024 * 1024 });
  return stdout;
};

const normalizeLogin = (login: string) => login.replace(/\[bot\]$/, "").toLowerCase();

const readExcludedAuthors = async () => {
  try {
    const source = await readFile(resolve(repositoryRoot, ".github/release.yml"), "utf8");
    const parsed = Bun.YAML.parse(source) as { changelog?: { exclude?: { authors?: string[] } } };
    return new Set((parsed.changelog?.exclude?.authors ?? []).map(normalizeLogin));
  } catch (error) {
    console.error("Could not read excluded authors from .github/release.yml", error);
    return new Set<string>();
  }
};

const parseVersion = (value: string) => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(value);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
};

const detectReleaseType = (previousTag: string, version: string): ReleaseType => {
  const previous = parseVersion(previousTag);
  const next = parseVersion(version);
  if (!previous || !next) return "minor";
  if (next.major !== previous.major) return "major";
  if (next.minor !== previous.minor) return "minor";
  return "patch";
};

const pullRequestNumbersFromNotes = (notes: string, repository: string) => {
  const escapedRepository = repository.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`github\\.com/${escapedRepository}/pull/(\\d+)`, "g");
  return [...notes.matchAll(pattern)].map((match) => Number(match[1]));
};

const firstTimeContributorsFromNotes = (notes: string): FirstTimeContributor[] => {
  const contributors: FirstTimeContributor[] = [];
  for (const line of notes.split("\n")) {
    const match = /^\* @(\S+) made their first contribution in \S+\/pull\/(\d+)/.exec(line);
    if (match) contributors.push({ login: match[1] ?? "", pullRequest: Number(match[2]) });
  }
  return contributors;
};

const pullRequestNumbersFromCommits = async (repository: string, previousTag: string, target: string) => {
  const stdout = await gh([
    "api",
    "--paginate",
    `repos/${repository}/compare/${previousTag}...${target}`,
    "--jq",
    '.commits[].commit.message | split("\\n")[0]',
  ]);
  const numbers: number[] = [];
  for (const subject of stdout.split("\n")) {
    const match = /\(#(\d+)\)\s*$/.exec(subject) ?? /^Merge pull request #(\d+)/.exec(subject);
    if (match) numbers.push(Number(match[1]));
  }
  return numbers;
};

const fetchPullRequests = async (repository: string, numbers: number[]) => {
  const [owner, name] = repository.split("/");
  const results: GraphqlPullRequest[] = [];
  for (let index = 0; index < numbers.length; index += graphqlChunkSize) {
    const chunk = numbers.slice(index, index + graphqlChunkSize);
    const fields = chunk
      .map(
        (number) => `p${number}: pullRequest(number: ${number}) {
          number url title body mergedAt
          author { login }
          labels(first: 20) { nodes { name } }
          closingIssuesReferences(first: 10) { nodes { number title url } }
        }`,
      )
      .join("\n");
    const query = `query { repository(owner: "${owner}", name: "${name}") { ${fields} } }`;
    const stdout = await gh(["api", "graphql", "-f", `query=${query}`]);
    const parsed = JSON.parse(stdout) as { data?: { repository?: Record<string, GraphqlPullRequest | null> } };
    for (const pullRequest of Object.values(parsed.data?.repository ?? {})) {
      if (pullRequest) results.push(pullRequest);
    }
  }
  return results;
};

const extractImages = (body: string): ImageReference[] => {
  const images: ImageReference[] = [];
  const seen = new Set<string>();
  const add = (url: string, alt: string) => {
    if (!url.startsWith("https://") || seen.has(url)) return;
    seen.add(url);
    images.push({ url, alt: alt.trim() });
  };

  for (const match of body.matchAll(/!\[([^\]]*)\]\((\S+?)(?:\s+"[^"]*")?\)/g)) {
    add(match[2] ?? "", match[1] ?? "");
  }
  for (const match of body.matchAll(/<img\b[^>]*>/gi)) {
    const source = /src=["']([^"']+)["']/i.exec(match[0]);
    const alt = /alt=["']([^"']*)["']/i.exec(match[0]);
    add(source?.[1] ?? "", alt?.[1] ?? "");
  }
  return images.slice(0, maxImagesPerPullRequest);
};

const cleanBody = (body: string, limit: number) => {
  const cleaned = body
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt: string) => (alt ? `[image: ${alt}]` : "[image]"))
    .replace(/<img\b[^>]*>/gi, "[image]")
    .replace(/^> _This was generated by AI during triage\._\s*$/gim, "")
    .replace(/^🤖 Generated with.*$/gim, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, limit)}…`;
};

const detectReleaseItems = async (from: string, to: string): Promise<ReleaseItem[]> => {
  try {
    const { stdout } = await execFileAsync(
      "bun",
      ["scripts/release-art/cli.ts", "detect", "--from", from, "--to", to],
      { cwd: repositoryRoot, maxBuffer: 16 * 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout) as { items?: ReleaseItem[] };
    return parsed.items ?? [];
  } catch (error) {
    console.error("New integration and widget detection failed, continuing without items", error);
    return [];
  }
};

const main = async () => {
  const { values } = parseArgs({
    options: {
      from: { type: "string" },
      to: { type: "string" },
      version: { type: "string" },
      repo: { type: "string" },
    },
  });

  if (!values.from || !values.to) {
    throw new Error(
      "Usage: collect-release-input.ts --from <tag> --to <ref> [--version <x.y.z>] [--repo <owner/name>]",
    );
  }

  const repository = values.repo ?? process.env.GITHUB_REPOSITORY ?? "homarr-labs/homarr";
  const version = (values.version ?? values.to).replace(/^v/, "");
  const tag = `v${version}`;

  const notes: string = await generateGithubNotes({
    cwd: repositoryRoot,
    env: process.env,
    repository,
    tag,
    target: values.to,
    previousTag: values.from,
  }).catch((error: unknown) => {
    console.error("generate-notes failed, falling back to compare commits", error);
    return "";
  });
  const numbers = new Set(pullRequestNumbersFromNotes(notes, repository));
  if (numbers.size === 0) {
    for (const number of await pullRequestNumbersFromCommits(repository, values.from, values.to)) numbers.add(number);
  }

  const [excludedAuthors, pullRequests, newItems] = await Promise.all([
    readExcludedAuthors(),
    fetchPullRequests(
      repository,
      [...numbers].toSorted((a, b) => a - b),
    ),
    detectReleaseItems(values.from, values.to),
  ]);

  const included = pullRequests
    .filter((pullRequest) => !excludedAuthors.has(normalizeLogin(pullRequest.author?.login ?? "ghost")))
    .toSorted((a, b) => (a.mergedAt ?? "").localeCompare(b.mergedAt ?? ""));
  const bodyLimit = Math.max(500, Math.min(maxBodyLength, Math.floor(bodyBudget / Math.max(included.length, 1))));
  const includedNumbers = new Set(included.map((pullRequest) => pullRequest.number));

  const input = {
    repository,
    version,
    tag,
    previousTag: values.from,
    releaseType: detectReleaseType(values.from, version),
    compareUrl: `https://github.com/${repository}/compare/${values.from}...${tag}`,
    newItems,
    firstTimeContributors: firstTimeContributorsFromNotes(notes).filter((contributor) =>
      includedNumbers.has(contributor.pullRequest),
    ),
    pullRequests: included.map(
      (pullRequest): PullRequestInput => ({
        number: pullRequest.number,
        url: pullRequest.url,
        title: pullRequest.title,
        author: pullRequest.author?.login ?? "ghost",
        labels: pullRequest.labels.nodes.map((label) => label.name),
        mergedAt: pullRequest.mergedAt,
        body: cleanBody(pullRequest.body, bodyLimit),
        images: extractImages(pullRequest.body),
        closes: pullRequest.closingIssuesReferences.nodes,
      }),
    ),
  };

  process.stdout.write(`${JSON.stringify(input, null, 2)}\n`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
