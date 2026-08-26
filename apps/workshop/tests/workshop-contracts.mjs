import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

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
if (!hook.includes('routerAdd("GET", "/workshop/{id}"') || !hook.includes('getStringSlice("screenshots")')) {
  throw new Error("Workshop detail routes must render server-side social metadata with submission screenshots");
}

const hookUtilsModule = { exports: {} };
vm.runInNewContext(await read("apps/workshop/pb_hooks/workshop-utils.js"), { module: hookUtilsModule });
const socialHtml = hookUtilsModule.exports.renderWorkshopSocialHtml(
  '<html><head><title data-rh="true">Homarr documentation</title><meta data-rh="true" property="og:title" content="Homarr documentation"><meta data-rh="true" name="description" content="Generic"><link data-rh="true" rel="canonical" href="https://homarr.dev/"></head></html>',
  {
    title: "Ocean <Glow> · Homarr Workshop",
    description: "Custom CSS for Homarr. Calm & readable.",
    url: "https://preview.example/workshop/abc",
    image: "https://preview.example/api/files/submissions/abc/preview.png",
    section: "Custom CSS",
    submissionTitle: "Ocean <Glow>",
  },
);
for (const expected of [
  "<title>Ocean &lt;Glow&gt; · Homarr Workshop</title>",
  'property="og:description" content="Custom CSS for Homarr. Calm &amp; readable."',
  'rel="canonical" href="https://preview.example/workshop/abc"',
  'property="og:image" content="https://preview.example/api/files/submissions/abc/preview.png"',
  'name="twitter:card" content="summary_large_image"',
  'property="article:section" content="Custom CSS"',
]) {
  if (!socialHtml.includes(expected)) throw new Error(`Workshop social metadata is missing: ${expected}`);
}
if (socialHtml.includes("Homarr documentation")) throw new Error("Workshop social metadata must replace generic tags");

const migration = await read("apps/workshop/pb_migrations/1784240000_workshop_widgets.js");
for (const removedField of ["displayName", "avatarUrl", "githubProfileUrl", "githubUsername"]) {
  if (migration.includes(removedField)) throw new Error(`Redundant Workshop user field remains: ${removedField}`);
}

const providerMigration = await read("apps/workshop/pb_migrations/1786500000_homarr_provider.js");
for (const required of ['name: "assistant_quotas"', 'name: "assistant_global_quota"', "idx_assistant_quotas_user"]) {
  if (!providerMigration.includes(required)) throw new Error(`Homarr provider migration is missing: ${required}`);
}
for (const forbidden of ['name: "assistant_requests"', 'name: "assistant_activity"', 'name: "dailyLimit"']) {
  if (providerMigration.includes(forbidden)) throw new Error(`Homarr provider must not persist ${forbidden}`);
}

const dailyQuotaMigration = await read("apps/workshop/pb_migrations/1787670446_daily_assistant_quotas.js");
for (const required of [
  'removeIndex("idx_assistant_quotas_user")',
  'addIndex("idx_assistant_quotas_user_day", true, "user, day", "")',
]) {
  if (!dailyQuotaMigration.includes(required)) throw new Error(`Daily quota migration is missing: ${required}`);
}

const providerBackend = await read("apps/workshop/homarr_provider.go");
for (const required of [
  '"homarr/model"',
  'apis.RequireAuth("users")',
  "DefaultActivityLoggerMiddlewareId",
  'os.Getenv("OPENROUTER_API_KEY")',
  'os.Getenv("HOMARR_AI_DAILY_REQUEST_LIMIT")',
  'os.Getenv("HOMARR_AI_GLOBAL_DAILY_REQUEST_LIMIT")',
  'os.Getenv("HOMARR_AI_OPENROUTER_MODEL")',
  '"data_collection": "deny"',
  '"zdr": true',
]) {
  if (!providerBackend.includes(required)) throw new Error(`Homarr provider backend is missing: ${required}`);
}
if (/logger\(\)|\.Logger\(|log\.Print/u.test(providerBackend)) {
  throw new Error("The Homarr provider must not log request content or user tokens");
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
if (!docsConfig.includes('path: "/workshop/:id"') || !docsConfig.includes("priority: -1")) {
  throw new Error("Workshop submission routes must not capture the moderation page");
}
await access(resolve("apps/docs/static/workshop-runtime-config.js"));
await access(resolve("apps/docs/src/pages/workshop/admin/index.tsx"));

console.log("Workshop static contracts passed");
