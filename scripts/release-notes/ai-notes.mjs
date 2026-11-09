import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { defaultReleaseNotesModel, requestReleaseNotes } from "./openrouter.mjs";

const execFileAsync = promisify(execFile);

const repositoryRoot = resolve(import.meta.dirname, "../..");
const skillDirectory = resolve(repositoryRoot, ".agents/skills/release-notes");
const releaseArtPlaceholder = "{{RELEASE_ART}}";

const loadInstructions = async () => {
  const [skill, example] = await Promise.all([
    readFile(join(skillDirectory, "SKILL.md"), "utf8"),
    readFile(join(skillDirectory, "references/example.md"), "utf8"),
  ]);
  const skillBody = skill.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  return `${skillBody}\n\n---\n\n${example.trim()}`;
};

const collectInput = async ({ cwd, env, repository, version, target, previousTag, signal }) => {
  const { stdout } = await execFileAsync(
    "bun",
    [
      join(skillDirectory, "scripts/collect-release-input.ts"),
      "--from",
      previousTag,
      "--to",
      target,
      "--version",
      version,
      "--repo",
      repository,
    ],
    { cwd, env, maxBuffer: 64 * 1024 * 1024, signal },
  );
  return JSON.parse(stdout);
};

const artFiles = (cwd, version) => {
  const directory = join(cwd, "docs/img/releases", version);
  return { svg: join(directory, "whats-new.svg"), png: join(directory, "whats-new.png") };
};

const renderArt = async ({ cwd, env, version, items, art, signal }) => {
  const oneLiners = new Map(art.map((entry) => [entry.slug, entry]));
  const payload = {
    items: items.map((item) => ({
      ...item,
      oneLiner: oneLiners.get(item.slug)?.oneLiner || item.description,
      screenshotUrl: oneLiners.get(item.slug)?.screenshotUrl ?? null,
    })),
  };

  const directory = await mkdtemp(join(tmpdir(), "homarr-release-art-"));
  try {
    const itemsFile = join(directory, "items.json");
    await writeFile(itemsFile, JSON.stringify(payload));
    await execFileAsync("bun", ["scripts/release-art/cli.ts", "render", "--version", version, "--items", itemsFile], {
      cwd,
      env,
      maxBuffer: 16 * 1024 * 1024,
      signal,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  const files = artFiles(cwd, version);
  await Promise.all([access(files.svg), access(files.png)]);
};

const applyArt = (body, imageMarkdown) => {
  const wholeLine = new RegExp(`^[ \\t]*${releaseArtPlaceholder.replace(/[{}]/g, "\\$&")}[ \\t]*$`, "m");
  const replaced = body.replace(wholeLine, imageMarkdown);
  return replaced
    .split(releaseArtPlaceholder)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export async function generateAiNotes({
  cwd,
  env,
  logger,
  repository,
  version,
  tag,
  target,
  previousTag,
  artRef,
  withArt,
  signal,
}) {
  const instructions = await loadInstructions();
  const input = await collectInput({ cwd, env, repository, version, target, previousTag, signal });
  logger.log(
    "Collected %d pull requests and %d new items for the release notes",
    input.pullRequests.length,
    input.newItems.length,
  );

  const model = env.RELEASE_NOTES_MODEL || defaultReleaseNotesModel;
  const { notes, usage } = await requestReleaseNotes({
    apiKey: env.OPENROUTER_API_KEY,
    model,
    instructions,
    input: JSON.stringify(input),
    repository,
    signal,
  });
  logger.log("Generated release notes with %s (usage: %s)", model, JSON.stringify(usage));

  let imageMarkdown = "";
  let imageUrl = "";
  if (withArt && input.newItems.length > 0) {
    try {
      await renderArt({ cwd, env, version, items: input.newItems, art: notes.art, signal });
      const base = `https://raw.githubusercontent.com/${repository}/${artRef}/docs/img/releases/${version}`;
      imageMarkdown = `![What's new in ${tag}](${base}/whats-new.svg)`;
      imageUrl = `${base}/whats-new.png`;
    } catch (error) {
      logger.warn(
        "Rendering release art failed, continuing without it: %s",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return {
    body: applyArt(notes.body, imageMarkdown),
    discord: { ...notes.discord, imageUrl },
  };
}
