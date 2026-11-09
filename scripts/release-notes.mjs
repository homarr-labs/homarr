import { rm, writeFile } from "node:fs/promises";

import { generateAiNotes } from "./release-notes/ai-notes.mjs";
import { generateGithubNotes } from "./release-notes/github-notes.mjs";

const aiTimeoutMilliseconds = 8 * 60 * 1000;
const notesByTag = new Map();

const shouldUseAi = ({ branch, env, lastRelease }) =>
  branch.name === "main" && !branch.prerelease && Boolean(env.OPENROUTER_API_KEY) && Boolean(lastRelease.gitTag);

const generateAiBody = async ({ cwd, env, logger, lastRelease, nextRelease }) => {
  try {
    const { body, discord } = await generateAiNotes({
      cwd,
      env,
      logger,
      repository: env.GITHUB_REPOSITORY,
      version: nextRelease.version,
      tag: nextRelease.gitTag,
      target: nextRelease.gitHead,
      previousTag: lastRelease.gitTag,
      artRef: nextRelease.gitTag,
      withArt: true,
      signal: AbortSignal.timeout(aiTimeoutMilliseconds),
    });
    if (env.RELEASE_DISCORD_FILE) {
      await writeFile(env.RELEASE_DISCORD_FILE, JSON.stringify(discord));
    }
    return body;
  } catch (error) {
    logger.warn(
      "AI release notes failed, using GitHub generated notes: %s",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
};

export async function generateNotes(_pluginConfig, context) {
  const { cwd, env, lastRelease, nextRelease } = context;

  const cached = notesByTag.get(nextRelease.gitTag);
  if (cached) return cached;

  if (env.RELEASE_DISCORD_FILE) {
    await rm(env.RELEASE_DISCORD_FILE, { force: true });
  }

  const githubNotes = await generateGithubNotes({
    cwd,
    env,
    repository: env.GITHUB_REPOSITORY,
    tag: nextRelease.gitTag,
    target: nextRelease.gitHead,
    previousTag: lastRelease.gitTag,
  });

  let notes = githubNotes;
  if (shouldUseAi(context)) {
    notes = (await generateAiBody(context)) ?? githubNotes;
  } else {
    context.logger.log("Skipping AI release notes: needs the main branch, OPENROUTER_API_KEY and a previous release");
  }

  notesByTag.set(nextRelease.gitTag, notes);
  return notes;
}
