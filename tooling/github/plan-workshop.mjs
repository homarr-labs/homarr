import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
const eventName = process.env.GITHUB_EVENT_NAME;
const sha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
let branch = process.env.GITHUB_REF_NAME;
let build = true;
let publish = false;
let tags = [];

if (eventName === "workflow_run") {
  branch = "main";
  const release = event.workflow_run;
  if (
    release.conclusion !== "success" ||
    release.head_branch !== "main" ||
    !["push", "workflow_dispatch"].includes(release.event) ||
    release.head_repository.full_name !== process.env.GITHUB_REPOSITORY
  ) {
    throw new Error("Only successful release workflows from this repository's main branch can publish stable images.");
  }
  execFileSync("git", ["merge-base", "--is-ancestor", release.head_sha, sha]);
  // Include Semantic Release's version commit, which is created after the triggering push.
  const changed = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      `${release.head_sha}^`,
      sha,
      "--",
      ":(glob).github/workflows/workshop.yml",
      ":(glob)tooling/github/plan-workshop.mjs",
      ":(glob).dockerignore",
      ":(glob)tooling/github/docker-build.sh",
      ":(glob)apps/workshop/**",
      ":(glob)apps/docs/**",
      ":(glob)tools/motion-reel/three/**",
      ":(glob)packages/common/**",
      ":(glob)packages/core/**",
      ":(glob)packages/custom-widgets/**",
      ":(glob)packages/definitions/**",
      ":(glob)packages/db/**",
      ":(glob)packages/server-settings/**",
      ":(glob)packages/settings/**",
      ":(glob)packages/translation/**",
      ":(glob)packages/ui/**",
      ":(glob)packages/validation/**",
      ":(glob)packages/workshop/**",
      ":(glob)tooling/typescript/**",
      ":(glob)patches/**",
      ":(glob)package.json",
      ":(glob)bun.lock",
      ":(glob)bunfig.toml",
      ":(glob)turbo.json",
      ":(glob,exclude)packages/**/*.spec.ts",
      ":(glob,exclude)packages/**/*.spec.tsx",
      ":(glob,exclude)packages/**/*.test.ts",
      ":(glob,exclude)packages/**/*.test.tsx",
      ":(glob,exclude)packages/**/__tests__/**",
      ":(glob,exclude)packages/**/*.md",
      ":(glob,exclude)packages/db/migrations/seed.ts",
    ],
    { encoding: "utf8" },
  );
  build = changed.trim().length > 0;
}

if (eventName === "pull_request") {
  publish = event.pull_request.head.repo.full_name === process.env.GITHUB_REPOSITORY && !event.pull_request.draft;
  tags = [`pr-${event.number}`];
} else if (["push", "workflow_run", "workflow_dispatch"].includes(eventName)) {
  if (branch === "main") {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Expected a stable version on main, got ${version}`);
    tags = ["latest", `v${version}`, `v${version.split(".")[0]}`];
    publish = true;
  } else if (branch === "dev") {
    tags = ["dev"];
    publish = true;
  } else {
    build = false;
  }
} else {
  build = false;
}

publish = publish && build && !process.env.ACT;
if (publish) tags.push(`sha-${sha}`);
if (!publish) tags = [];
for (const [key, value] of Object.entries({ sha, build, publish, tags: tags.join(" ") })) {
  appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}
