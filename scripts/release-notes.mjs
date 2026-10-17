import { execFile } from "node:child_process";
import { promisify } from "node:util";

export async function generateNotes(_pluginConfig, { cwd, env, lastRelease, nextRelease }) {
  const argumentsList = [
    "api",
    "--method",
    "POST",
    `repos/${env.GITHUB_REPOSITORY}/releases/generate-notes`,
    "-f",
    `tag_name=${nextRelease.gitTag}`,
    "-f",
    `target_commitish=${nextRelease.gitHead}`,
    "--jq",
    ".body",
  ];

  if (lastRelease.gitTag) {
    argumentsList.push("-f", `previous_tag_name=${lastRelease.gitTag}`);
  }

  const { stdout } = await promisify(execFile)("gh", argumentsList, {
    cwd,
    env,
    maxBuffer: 1024 * 1024,
  });
  return stdout.trim();
}
