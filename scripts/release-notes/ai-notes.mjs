import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { defaultReleaseNotesModel, requestReleaseNotes } from "./openrouter.mjs";
import { skillDirectory } from "./paths.mjs";

const execFileAsync = promisify(execFile);

const placeholderLine = /^[ \t]*\{\{RELEASE_ART\}\}[ \t]*(?:\n[ \t]*(?=\n))*\n?/m;
const titleLine = /^# .*$/m;

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

const artDirectory = (version) => `docs/img/releases/${version}`;

const artUrls = ({ repository, ref, version }) => {
  const base = `https://raw.githubusercontent.com/${repository}/${ref}/${artDirectory(version)}`;
  return { svg: `${base}/whats-new.svg`, png: `${base}/whats-new.png` };
};

const existsAtRef = async (cwd, ref, path) => {
  try {
    await execFileAsync("git", ["cat-file", "-e", `${ref}:${path}`], { cwd });
    return true;
  } catch {
    return false;
  }
};

const renderArt = async ({ cwd, env, version, newItems, art, signal }) => {
  const oneLiners = new Map(art.map((entry) => [entry.slug, entry]));
  const items = newItems.map((item) => ({
    ...item,
    oneLiner: oneLiners.get(item.slug)?.oneLiner || item.description,
    screenshotUrl: oneLiners.get(item.slug)?.screenshotUrl ?? null,
  }));

  const directory = await mkdtemp(join(tmpdir(), "homarr-release-art-"));
  try {
    const itemsFile = join(directory, "items.json");
    await writeFile(itemsFile, JSON.stringify(items));
    await execFileAsync("bun", ["scripts/release-art/cli.ts", "render", "--version", version, "--items", itemsFile], {
      cwd,
      env,
      maxBuffer: 16 * 1024 * 1024,
      signal,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }

  await Promise.all(["whats-new.svg", "whats-new.png"].map((file) => access(join(cwd, artDirectory(version), file))));
};

const resolveArt = async ({ cwd, env, logger, repository, version, artRef, input, notes, renderArtFiles, signal }) => {
  if (input.releaseType === "patch" || input.newItems.length === 0) return null;

  try {
    if (renderArtFiles) {
      await renderArt({ cwd, env, version, newItems: input.newItems, art: notes.art, signal });
    } else {
      const files = ["whats-new.svg", "whats-new.png"].map((file) => `${artDirectory(version)}/${file}`);
      const present = await Promise.all(files.map((file) => existsAtRef(cwd, artRef, file)));
      if (!present.every(Boolean)) return null;
    }
    return artUrls({ repository, ref: artRef, version });
  } catch (error) {
    logger.warn("Rendering release art failed, continuing without it", error);
    return null;
  }
};

const placeArt = (body, image) => {
  if (!image) return body.replace(placeholderLine, "");
  if (placeholderLine.test(body)) return body.replace(placeholderLine, () => `${image}\n\n`);
  if (titleLine.test(body)) return body.replace(titleLine, (title) => `${title}\n\n${image}`);
  return `${image}\n\n${body}`;
};

const firstHighlightImage = (body) => {
  const afterHeading = body.split(/^## Highlights[^\n]*\n/m)[1] ?? "";
  const highlights = afterHeading.split(/^## /m)[0] ?? "";
  return /!\[[^\]]*\]\((https:\/\/[^)\s]+)/.exec(highlights)?.[1];
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
  renderArtFiles,
  signal,
}) {
  const instructions = await loadInstructions();
  const input = await collectInput({ cwd, env, repository, version, target, previousTag, signal });
  logger.log(
    "Collected %d pull requests and %d new items for the %s release notes",
    input.pullRequests.length,
    input.newItems.length,
    input.releaseType,
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

  const art = await resolveArt({
    cwd,
    env,
    logger,
    repository,
    version,
    artRef,
    input,
    notes,
    renderArtFiles,
    signal,
  });

  const body = placeArt(notes.body, art && `![What's new in ${tag}](${art.svg})`);
  const imageUrl = art?.png ?? firstHighlightImage(body);

  return { body, discord: { ...notes.discord, imageUrl } };
}
