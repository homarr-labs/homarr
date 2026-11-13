import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function generateGithubNotes({ cwd, env, repository, tag, target, previousTag }) {
  const argumentsList = [
    "api",
    "--method",
    "POST",
    `repos/${repository}/releases/generate-notes`,
    "-f",
    `tag_name=${tag}`,
    "-f",
    `target_commitish=${target}`,
    "--jq",
    ".body",
  ];

  if (previousTag) {
    argumentsList.push("-f", `previous_tag_name=${previousTag}`);
  }

  const { stdout } = await execFileAsync("gh", argumentsList, {
    cwd,
    env,
    maxBuffer: 1024 * 1024,
  });
  return stdout.trim();
}
