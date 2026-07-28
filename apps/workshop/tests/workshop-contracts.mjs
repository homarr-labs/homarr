import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const read = (path) => readFile(resolve(path), "utf8");

const packageJson = JSON.parse(await read("packages/workshop/package.json"));
const clientExport = packageJson.exports?.["./client"];
if (typeof clientExport !== "string") throw new Error("Workshop client export is missing");
await access(resolve("packages/workshop", clientExport));

const hook = await read("apps/workshop/pb_hooks/workshop.pb.js");
const hookUtils = await read("apps/workshop/pb_hooks/workshop-utils.js");
const widgetValidator = await read("apps/workshop/pb_hooks/widget-validator.js");
const canonicalWidgetValidator = await read("packages/workshop/src/pocketbase-validator.ts");
const dockerfile = await read("apps/workshop/Dockerfile");
const schema = await read("packages/workshop/src/schema.ts");
const workshopApp = await read("apps/docs/src/components/workshop/WorkshopApp.tsx");
const workshopAdmin = await read("apps/docs/src/components/workshop/WorkshopAdmin.tsx");
const workshopDetail = await read("apps/docs/src/components/workshop/DetailPage.tsx");
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
if (!hook.includes("WORKSHOP_REQUIRE_OAUTH") || !hook.includes("partial_credentials")) {
  throw new Error("Workshop OAuth bootstrap must reject partial and required-but-disabled configurations");
}
if (
  !hook.includes("onRecordAuthWithOAuth2Request") ||
  !hook.includes("deriveGithubIdentity") ||
  !hook.includes("event.oauth2User") ||
  hook.includes("event.oAuth2User") ||
  !hook.includes("event.createData.displayName = identity.displayName") ||
  !hook.includes('event.record.set("displayName", identity.displayName)') ||
  !hook.includes("workshop_oauth_identity_synchronized")
) {
  throw new Error("Workshop GitHub identity must be synchronized for first and returning OAuth logins");
}
if (!hook.includes("workshop_report_reopened") || !hook.includes("status = 'dismissed'")) {
  throw new Error("Workshop must permit a fresh report after a previous report was dismissed");
}
if (
  !widgetValidator.includes("widget-validator.bundle.cjs") ||
  !canonicalWidgetValidator.includes("customWidgetDefinitionSchema.safeParse")
) {
  throw new Error("Workshop direct writes must use the bundled canonical Custom Widget validator");
}
await access(resolve("apps/workshop/pb_hooks/widget-validator.bundle.cjs"));
if (!dockerfile.includes("WORKSHOP_REQUIRE_PUBLIC_ORIGIN=true")) {
  throw new Error("The production Workshop image must require an explicit public origin");
}
if (!dockerfile.includes("COPY --from=dependencies") || !dockerfile.includes("widget-validator.bundle.cjs")) {
  throw new Error("The production Workshop image must copy the freshly generated canonical validator");
}
if (hook.includes('findAllRecords("users")') || !hook.includes('findRecordsByFilter("users"')) {
  throw new Error("Workshop report notifications must use a filtered, bounded administrator query");
}
if (!hook.includes("WORKSHOP_WEB_URL")) {
  throw new Error("PocketBase-generated Workshop links must use the configured public web URL");
}
for (const [name, source] of [
  ["Workshop listing", workshopApp],
  ["Workshop moderation", workshopAdmin],
  ["Workshop detail", workshopDetail],
]) {
  if (/<a\b[^>]*\bhref=["']\/workshop/u.test(source)) {
    throw new Error(`${name} must use base-path-aware Docusaurus links`);
  }
  if (/window\.location(?:\.href)?\s*=\s*["']\/workshop/u.test(source)) {
    throw new Error(`${name} must use a base-path-aware redirect`);
  }
}

const migration = await read("apps/workshop/pb_migrations/1784240000_workshop_widgets.js");
for (const required of [
  "workshop_migration_state",
  "addedUserFields",
  "cloneRule(users.listRule)",
  "CREATE TRIGGER submissions_revision_cas",
  "NEW.expectedRevision != OLD.revision",
  "state.rateLimits.enabled",
  "users.passwordAuth = state.users.passwordAuth",
  "users.oauth2 = state.users.oauth2",
  "app.delete(users)",
]) {
  if (!migration.includes(required)) throw new Error(`Workshop rollback is missing state restoration: ${required}`);
}

const hardeningMigration = await read("apps/workshop/pb_migrations/1784240001_workshop_write_rate_limits.js");
for (const operation of ["create", "update", "delete"]) {
  for (const collection of ["submissions", "votes", "comments", "reports"]) {
    const label = `${collection}:${operation}`;
    if (!hardeningMigration.includes(label)) throw new Error(`Workshop write rate limit is missing: ${label}`);
  }
}
if (!hardeningMigration.includes("users:update")) throw new Error("Workshop user file updates must be rate limited");
for (const required of [
  "writeRateLimits",
  "managedRules(settings.rateLimits.rules)",
  "settings.rateLimits.enabled = state.enabled",
  "...cloneJson(state.managedRules)",
]) {
  if (!hardeningMigration.includes(required)) {
    throw new Error(`Workshop write rate-limit rollback is missing persistent state restoration: ${required}`);
  }
}

const accessHardeningMigration = await read("apps/workshop/pb_migrations/1784240002_workshop_access_hardening.js");
const rateLimitCompatibilityMigration = await read(
  "apps/workshop/pb_migrations/1784240003_workshop_rate_limit_rollback_compatibility.js",
);
for (const required of ["writeRateLimits", "legacyCreateRules", "rate-limit compatibility state is unavailable"]) {
  if (!rateLimitCompatibilityMigration.includes(required)) {
    throw new Error(`Workshop rate-limit compatibility migration is missing: ${required}`);
  }
}
for (const protectedField of [
  "email:changed",
  "displayName:changed",
  "avatarUrl:changed",
  "githubUsername:changed",
  "githubProfileUrl:changed",
]) {
  if (!accessHardeningMigration.includes(protectedField)) {
    throw new Error(`Workshop OAuth identity field remains caller-controlled: ${protectedField}`);
  }
}
if (accessHardeningMigration.includes("@request.body.avatar:changed")) {
  throw new Error("Workshop access rules must not use the unsupported :changed modifier for file fields");
}
if (
  !hook.includes('getUnsavedFiles("avatar")') ||
  !hook.includes('original().getString("avatar")') ||
  !hook.includes("Workshop avatars are managed by GitHub OAuth")
) {
  throw new Error("Workshop avatar updates must be rejected by the user update request hook");
}
for (const protectedField of [
  "title:changed",
  "description:changed",
  "content:changed",
  "changelog:changed",
  "screenshots:changed",
]) {
  if (!accessHardeningMigration.includes(protectedField)) {
    throw new Error(`Workshop moderators can still rewrite submissions: ${protectedField}`);
  }
}
for (const protectedField of ["category:changed", "explanation:changed"]) {
  if (!accessHardeningMigration.includes(protectedField)) {
    throw new Error(`Workshop moderators can still rewrite reports: ${protectedField}`);
  }
}

const workflow = await read(".github/workflows/workshop.yml");
if (/\n\s+paths:/u.test(workflow)) throw new Error("Workshop workflow must not filter out Docker build inputs");
if (!workflow.includes("DOCS_BASE_URL=/docs-site/") || !workflow.includes("workshop-base-path-smoke")) {
  throw new Error("Workshop CI must exercise a non-root documentation deployment");
}

console.log("Workshop static contracts passed");
