import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const read = (path) => readFile(resolve(path), "utf8");

const packageJson = JSON.parse(await read("packages/workshop/package.json"));
const clientExport = packageJson.exports?.["./client"];
if (typeof clientExport !== "string") throw new Error("Workshop client export is missing");
await access(resolve("packages/workshop", clientExport));

const hook = await read("apps/workshop/pb_hooks/workshop.pb.js");
if (!hook.includes("require(`${__hooks}/workshop-utils.js`)")) {
  throw new Error("Workshop handlers must load shared helpers inside their isolated PocketBase contexts");
}
if (!hook.includes("onBootstrap") || !hook.includes("users.oauth2.providers = configured")) {
  throw new Error("Workshop OAuth settings must be synchronized at every bootstrap");
}
if (!hook.includes('username: "name"') || hook.includes("onRecordAuthWithOAuth2Request")) {
  throw new Error("Workshop identity must use PocketBase's direct GitHub username mapping");
}
if (hook.includes("validateAndNormalizeSubmission")) {
  throw new Error("PocketBase must store Workshop submissions without interpreting their content");
}
for (const artifact of [
  "apps/workshop/pb_hooks/widget-validator.js",
  "apps/workshop/pb_hooks/widget-validator.bundle.cjs",
  "packages/workshop/src/pocketbase-validator.ts",
  "scripts/build-workshop-validator.mjs",
]) {
  await access(resolve(artifact))
    .then(() => {
      throw new Error(`Workshop validator artifact must stay removed: ${artifact}`);
    })
    .catch((error) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
      throw error;
    });
}
if (hook.includes('findAllRecords("users")') || !hook.includes('findRecordsByFilter("users"')) {
  throw new Error("Workshop report notifications must use a filtered, bounded administrator query");
}

const migration = await read("apps/workshop/pb_migrations/1784240000_workshop_widgets.js");
for (const removedField of ["displayName", "avatarUrl", "githubProfileUrl", "githubUsername"]) {
  if (migration.includes(removedField)) throw new Error(`Redundant Workshop user field remains: ${removedField}`);
}
for (const required of [
  "workshop_migration_state",
  "addedUserFields",
  "cloneRule(users.listRule)",
  "CREATE TRIGGER submissions_revision_cas",
  "NEW.expectedRevision != OLD.revision",
  "users.passwordAuth = state.users.passwordAuth",
  "users.oauth2 = state.users.oauth2",
  "app.delete(users)",
]) {
  if (!migration.includes(required)) throw new Error(`Workshop rollback is missing state restoration: ${required}`);
}

const workflow = await read(".github/workflows/workshop.yml");
if (/\n\s+paths:/u.test(workflow)) throw new Error("Workshop workflow must not filter out Docker build inputs");

const entrypoint = await read("apps/workshop/entrypoint.sh");
if (!entrypoint.includes("/pb_public/workshop-runtime-config.js") || !entrypoint.includes("WORKSHOP_API_URL")) {
  throw new Error("Workshop must publish its API URL when the container starts");
}

const docsConfig = await read("apps/docs/docusaurus.config.ts");
if (!docsConfig.includes('scripts: [{ src: "/workshop-runtime-config.js" }]')) {
  throw new Error("Workshop must load the container runtime configuration before the documentation bundle");
}
await access(resolve("apps/docs/static/workshop-runtime-config.js"));

console.log("Workshop static contracts passed");
