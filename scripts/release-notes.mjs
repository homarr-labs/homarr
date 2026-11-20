import { execFile } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";

import { generateAiNotes } from "./release-notes/ai-notes.mjs";
import { generateGithubNotes } from "./release-notes/github-notes.mjs";

const execFileAsync = promisify(execFile);

const aiTimeoutMilliseconds = 8 * 60 * 1000;

const tagExists = async (cwd, tag) => {
  try {
    await execFileAsync("git", ["rev-parse", "--verify", "--quiet", `refs/tags/${tag}`], { cwd });
    return true;
  } catch {
    return false;
  }
};

const shouldUseAi = async ({ branch, cwd, env, lastRelease, nextRelease }) => {
  if (branch.name !== "main" || branch.prerelease || !env.OPENROUTER_API_KEY || !lastRelease.gitTag) return false;
  return !(await tagExists(cwd, nextRelease.gitTag));
};

const tryAiNotes = async (context) => {
  const { cwd, env, logger, lastRelease, nextRelease } = context;

  if (!(await shouldUseAi(context))) {
    logger.log("Skipping AI release notes: needs a new release on main, OPENROUTER_API_KEY and a previous release");
    return null;
  }

  try {
    return await generateAiNotes({
      cwd,
      env,
      logger,
      repository: env.GITHUB_REPOSITORY,
      version: nextRelease.version,
      tag: nextRelease.gitTag,
      target: nextRelease.gitHead,
      previousTag: lastRelease.gitTag,
      artRef: nextRelease.gitTag,
      renderArtFiles: true,
      signal: AbortSignal.timeout(aiTimeoutMilliseconds),
    });
  } catch (error) {
    logger.warn("AI release notes failed, using GitHub generated notes", error);
    return null;
  }
};

export async function generateNotes(_pluginConfig, context) {
  const { cwd, env, lastRelease, nextRelease } = context;

  if (env.RELEASE_DISCORD_FILE) {
    await rm(env.RELEASE_DISCORD_FILE, { force: true });
  }

  const aiNotes = await tryAiNotes(context);
  if (!aiNotes) {
    return generateGithubNotes({
      cwd,
      env,
      repository: env.GITHUB_REPOSITORY,
      tag: nextRelease.gitTag,
      target: nextRelease.gitHead,
      previousTag: lastRelease.gitTag,
    });
  }

  if (env.RELEASE_DISCORD_FILE) {
    await writeFile(env.RELEASE_DISCORD_FILE, JSON.stringify(aiNotes.discord));
  }
  return aiNotes.body;
}
