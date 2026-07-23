import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const read = (path) => readFile(resolve(path), "utf8");

const packageJson = JSON.parse(await read("packages/workshop/package.json"));
const clientExport = packageJson.exports?.["./client"];
if (typeof clientExport !== "string") throw new Error("Workshop client export is missing");
await access(resolve("packages/workshop", clientExport));

const hook = await read("apps/workshop/pb_hooks/workshop.pb.js");
const hookUtils = await read("apps/workshop/pb_hooks/workshop-utils.js");
const schema = await read("packages/workshop/src/schema.ts");
const constantValue = (source, name) => {
  const match = source.match(new RegExp(`(?:export )?const ${name} = ([\\d_]+)`));
  if (!match?.[1]) throw new Error(`Workshop limit ${name} is missing or is not a numeric literal`);
  return Number(match[1].replaceAll("_", ""));
};
if (constantValue(hookUtils, "MAX_CSS_LENGTH") !== constantValue(schema, "MAX_WORKSHOP_CSS_LENGTH")) {
  throw new Error("PocketBase and shared Workshop CSS limits must match");
}
if (constantValue(hookUtils, "MAX_CONTENT_LENGTH") !== constantValue(schema, "MAX_WORKSHOP_CONTENT_LENGTH")) {
  throw new Error("PocketBase and shared Workshop content limits must match");
}
if (!hook.includes("require(`${__hooks}/workshop-utils.js`)")) {
  throw new Error("Workshop handlers must load shared helpers inside their isolated PocketBase contexts");
}
if (!hook.includes("onBootstrap") || !hook.includes("users.oauth2.providers = configured")) {
  throw new Error("Workshop OAuth settings must be synchronized at every bootstrap");
}
if (hook.includes('findAllRecords("users")') || !hook.includes('findRecordsByFilter("users"')) {
  throw new Error("Workshop report notifications must use a filtered, bounded administrator query");
}

const migration = await read("apps/workshop/pb_migrations/1784240000_workshop_widgets.js");
for (const required of [
  "workshop_migration_state",
  "addedUserFields",
  "CREATE TRIGGER submissions_revision_cas",
  "NEW.expectedRevision != OLD.revision",
  "state.rateLimits.enabled",
  "users.passwordAuth = state.users.passwordAuth",
  "users.oauth2 = state.users.oauth2",
]) {
  if (!migration.includes(required)) throw new Error(`Workshop rollback is missing state restoration: ${required}`);
}

const workflow = await read(".github/workflows/workshop.yml");
if (/\n\s+paths:/u.test(workflow)) throw new Error("Workshop workflow must not filter out Docker build inputs");

console.log("Workshop static contracts passed");
