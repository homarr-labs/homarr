import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const nodeRequire = createRequire(import.meta.url);
const workshopUtils = nodeRequire("../pb_hooks/workshop-utils.js");
const hookSource = await readFile("apps/workshop/pb_hooks/workshop.pb.js", "utf8");
let oauthHook;
let userUpdateHook;

const ignoreHook = () => {};
vm.runInNewContext(hookSource, {
  __hooks: "/pb_hooks",
  console: { log: () => {} },
  onBootstrap: ignoreHook,
  onRecordAfterCreateSuccess: ignoreHook,
  onRecordCreateRequest: ignoreHook,
  onRecordDeleteRequest: ignoreHook,
  onRecordUpdateRequest: (handler, collection) => {
    if (collection === "users") userUpdateHook = handler;
  },
  onRecordAuthWithOAuth2Request: (handler, collection) => {
    if (collection !== "users") throw new Error(`OAuth hook targets unexpected collection: ${collection}`);
    oauthHook = handler;
  },
  require: (specifier) => {
    if (specifier !== "/pb_hooks/workshop-utils.js") {
      throw new Error(`OAuth hook loaded unexpected dependency: ${specifier}`);
    }
    return {
      ...workshopUtils,
      rejectRequest: (message) => {
        throw new Error(message);
      },
    };
  },
});

if (typeof oauthHook !== "function") throw new Error("Workshop OAuth request hook was not registered");
if (typeof userUpdateHook !== "function") throw new Error("Workshop user update hook was not registered");

const oauth2User = {
  id: "provider-user-123",
  name: "Octo Cat",
  username: "octocat",
  avatarURL: "https://avatars.githubusercontent.com/u/1?v=4",
  rawUser: {},
};
const createData = {};
let createNextCalls = 0;
oauthHook({
  app: { save: () => Promise.reject(new Error("New OAuth users must not be saved before PocketBase creates them")) },
  createData,
  next: () => {
    createNextCalls += 1;
  },
  oauth2User,
  providerName: "github",
  record: null,
});
if (
  createNextCalls !== 1 ||
  createData.displayName !== "Octo Cat" ||
  createData.avatarUrl !== "https://avatars.githubusercontent.com/u/1?v=4" ||
  createData.githubUsername !== "octocat" ||
  createData.githubProfileUrl !== "https://github.com/octocat"
) {
  throw new Error(`First GitHub OAuth login did not synchronize trusted identity: ${JSON.stringify(createData)}`);
}

const returningValues = new Map();
const returningRecord = {
  id: "returning-user-123",
  set: (name, value) => returningValues.set(name, value),
};
let savedRecord;
let returningNextCalls = 0;
oauthHook({
  app: {
    save: (record) => {
      savedRecord = record;
    },
  },
  createData: {},
  next: () => {
    returningNextCalls += 1;
  },
  oauth2User,
  providerName: "github",
  record: returningRecord,
});
if (
  savedRecord !== returningRecord ||
  returningNextCalls !== 1 ||
  returningValues.get("displayName") !== "Octo Cat" ||
  returningValues.get("avatar") !== "" ||
  returningValues.get("avatarUrl") !== "https://avatars.githubusercontent.com/u/1?v=4" ||
  returningValues.get("githubUsername") !== "octocat" ||
  returningValues.get("githubProfileUrl") !== "https://github.com/octocat"
) {
  throw new Error("Returning GitHub OAuth login did not refresh trusted identity");
}

const ignoredCreateData = {};
let ignoredNextCalls = 0;
oauthHook({
  app: {},
  createData: ignoredCreateData,
  next: () => {
    ignoredNextCalls += 1;
  },
  oauth2User,
  providerName: "oidc",
  record: null,
});
if (ignoredNextCalls !== 1 || Object.keys(ignoredCreateData).length !== 0) {
  throw new Error("Non-GitHub OAuth providers must pass through without GitHub identity synchronization");
}

let unchangedAvatarNextCalls = 0;
userUpdateHook({
  next: () => {
    unchangedAvatarNextCalls += 1;
  },
  record: {
    getString: () => "provider-avatar.png",
    getUnsavedFiles: () => [],
    original: () => ({ getString: () => "provider-avatar.png" }),
  },
});
if (unchangedAvatarNextCalls !== 1) {
  throw new Error("User updates that leave the provider avatar unchanged must pass through");
}

for (const avatarChange of [
  {
    name: "upload",
    current: "provider-avatar.png",
    original: "provider-avatar.png",
    unsavedFiles: [{ name: "forged-avatar.png" }],
  },
  {
    name: "removal",
    current: "",
    original: "provider-avatar.png",
    unsavedFiles: [],
  },
]) {
  let nextCalls = 0;
  try {
    userUpdateHook({
      next: () => {
        nextCalls += 1;
      },
      record: {
        getString: () => avatarChange.current,
        getUnsavedFiles: () => avatarChange.unsavedFiles,
        original: () => ({ getString: () => avatarChange.original }),
      },
    });
    throw new Error(`Workshop user avatar ${avatarChange.name} was accepted`);
  } catch (error) {
    if (!String(error).includes("managed by GitHub OAuth")) throw error;
  }
  if (nextCalls !== 0) throw new Error(`Rejected avatar ${avatarChange.name} continued the update request`);
}

console.log("Workshop OAuth hook contract passed");
