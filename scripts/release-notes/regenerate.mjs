import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs, promisify } from "node:util";

import { generateAiNotes } from "./ai-notes.mjs";
import { generateGithubNotes } from "./github-notes.mjs";

const execFileAsync = promisify(execFile);

const repositoryRoot = resolve(import.meta.dirname, "../..");
const aiTimeoutMilliseconds = 8 * 60 * 1000;
const stableTag = /^v\d+\.\d+\.\d+$/;

const usage = `Usage: node scripts/release-notes/regenerate.mjs --tag <vX.Y.Z> [options]

  --dry-run             Print or write the notes instead of editing the GitHub release
  --out <file>          Write the notes to this file (dry runs print to stdout otherwise)
  --discord-out <file>  Write the Discord announcement block to this file
  --no-art              Skip rendering the what's-new image
  --art-ref <ref>       Git ref the rendered image is linked from (default: the tag)
  --repo <owner/name>   Repository (default: GITHUB_REPOSITORY or homarr-labs/homarr)

Needs an authenticated gh. OPENROUTER_API_KEY enables the AI notes and RELEASE_NOTES_MODEL picks the model.
Without a key, a dry run prints the GitHub generated notes and a real run refuses to edit the release.
Rendered art lands in docs/img/releases/<version>/ and has to be committed before --art-ref can serve it.`;

const logger = {
  log: (...messages) => console.error(...messages),
  warn: (...messages) => console.error(...messages),
};

const findPreviousStableTag = async (tag) => {
  const { stdout } = await execFileAsync("git", ["tag", "--list", "v*", "--sort=-v:refname", "--merged", `${tag}^`], {
    cwd: repositoryRoot,
  });
  const previous = stdout
    .split("\n")
    .map((line) => line.trim())
    .find((candidate) => stableTag.test(candidate) && candidate !== tag);
  if (!previous) {
    throw new Error(`No stable tag found before ${tag}`);
  }
  return previous;
};

const main = async () => {
  const { values } = parseArgs({
    options: {
      tag: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      out: { type: "string" },
      "discord-out": { type: "string" },
      "no-art": { type: "boolean", default: false },
      "art-ref": { type: "string" },
      repo: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    console.log(usage);
    return;
  }

  if (!values.tag || !stableTag.test(values.tag)) {
    console.error(usage);
    throw new Error("--tag must look like v2.12.0");
  }

  const tag = values.tag;
  const version = tag.slice(1);
  const repository = values.repo ?? process.env.GITHUB_REPOSITORY ?? "homarr-labs/homarr";
  const previousTag = await findPreviousStableTag(tag);
  const env = { ...process.env, GITHUB_REPOSITORY: repository };

  logger.log("Regenerating notes for %s (previous release %s)", tag, previousTag);

  const githubNotes = await generateGithubNotes({
    cwd: repositoryRoot,
    env,
    repository,
    tag,
    target: tag,
    previousTag,
  });

  let aiNotes = null;
  if (env.OPENROUTER_API_KEY) {
    try {
      aiNotes = await generateAiNotes({
        cwd: repositoryRoot,
        env,
        logger,
        repository,
        version,
        tag,
        target: tag,
        previousTag,
        artRef: values["art-ref"] ?? tag,
        withArt: !values["no-art"],
        signal: AbortSignal.timeout(aiTimeoutMilliseconds),
      });
    } catch (error) {
      logger.warn("AI release notes failed: %s", error instanceof Error ? error.message : error);
    }
  } else {
    logger.warn("OPENROUTER_API_KEY is not set");
  }

  if (!aiNotes && !values["dry-run"]) {
    throw new Error("No AI notes were produced, leaving the release untouched. Use --dry-run to inspect the fallback.");
  }

  const body = aiNotes?.body ?? githubNotes;
  if (!aiNotes) {
    logger.warn("Using the GitHub generated notes as the dry-run output");
  }

  if (values["discord-out"] && aiNotes) {
    await writeFile(values["discord-out"], JSON.stringify(aiNotes.discord));
  }

  if (values["dry-run"]) {
    if (values.out) {
      await writeFile(values.out, `${body}\n`);
      logger.log("Wrote notes to %s", values.out);
      return;
    }
    process.stdout.write(`${body}\n`);
    return;
  }

  const directory = await mkdtemp(join(tmpdir(), "homarr-release-notes-"));
  try {
    const notesFile = values.out ?? join(directory, "notes.md");
    await writeFile(notesFile, `${body}\n`);
    await execFileAsync("gh", ["release", "edit", tag, "--repo", repository, "--notes-file", notesFile], {
      cwd: repositoryRoot,
      env,
    });
    logger.log("Updated the notes of release %s", tag);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
