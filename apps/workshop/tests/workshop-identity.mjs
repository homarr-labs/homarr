import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { deriveGithubIdentity } = require("../pb_hooks/workshop-utils.js");

const identity = deriveGithubIdentity(
  {
    name: "  Octo Cat  ",
    username: "octocat",
    avatarURL: "https://avatars.githubusercontent.com/u/1?v=4",
    rawUser: {},
  },
  "record123456",
);
if (
  identity.displayName !== "octocat" ||
  identity.githubUsername !== "octocat" ||
  identity.githubProfileUrl !== "https://github.com/octocat" ||
  identity.avatarUrl !== "https://avatars.githubusercontent.com/u/1?v=4"
) {
  throw new Error(`Trusted GitHub identity was not normalized: ${JSON.stringify(identity)}`);
}

const rawFallback = deriveGithubIdentity(
  {
    name: "",
    username: "",
    avatarURL: "",
    rawUser: {
      name: "\nRaw User\u0000",
      login: "raw-user",
      avatar_url: "https://avatars.githubusercontent.com/u/2",
    },
  },
  "record123456",
);
if (
  rawFallback.displayName !== "raw-user" ||
  rawFallback.githubUsername !== "raw-user" ||
  rawFallback.githubProfileUrl !== "https://github.com/raw-user"
) {
  throw new Error(`Raw GitHub identity fallback was not normalized: ${JSON.stringify(rawFallback)}`);
}

const rejected = deriveGithubIdentity(
  {
    name: "\n",
    username: "not/a/github-user",
    avatarURL: "javascript:alert(1)",
    rawUser: {},
  },
  "record123456",
);
if (
  rejected.displayName !== "GitHub user record12" ||
  rejected.githubUsername !== "" ||
  rejected.githubProfileUrl !== "" ||
  rejected.avatarUrl !== ""
) {
  throw new Error(`Invalid provider identity fields were retained: ${JSON.stringify(rejected)}`);
}

console.log("Workshop OAuth identity normalization passed");
