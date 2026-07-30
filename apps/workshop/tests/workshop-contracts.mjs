import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const read = (path) => readFile(resolve(path), "utf8");

const packageJson = JSON.parse(await read("packages/workshop/package.json"));
const clientExport = packageJson.exports?.["./client"];
if (typeof clientExport !== "string") throw new Error("Workshop client export is missing");
await access(resolve("packages/workshop", clientExport));

const hook = await read("apps/workshop/pb_hooks/workshop.pb.js");
const dockerfile = await read("apps/workshop/Dockerfile");
const workshopApp = await read("apps/docs/src/components/workshop/WorkshopApp.tsx");
const workshopAdmin = await read("apps/docs/src/components/workshop/WorkshopAdmin.tsx");
const workshopDetail = await read("apps/docs/src/components/workshop/DetailPage.tsx");
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
if (hook.includes("validateAndNormalizeSubmission") || hook.includes("workshop_submission_rejected")) {
  throw new Error("PocketBase must not interpret or validate Workshop submission content");
}
for (const removedValidator of [
  "apps/workshop/pb_hooks/widget-validator.js",
  "apps/workshop/pb_hooks/widget-validator.bundle.cjs",
  "packages/workshop/src/pocketbase-validator.ts",
  "scripts/build-workshop-validator.mjs",
]) {
  let artifactExists = true;
  try {
    await access(resolve(removedValidator));
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      artifactExists = false;
    } else {
      throw error;
    }
  }
  if (artifactExists) throw new Error(`Workshop validator artifact must stay removed: ${removedValidator}`);
}
if (!dockerfile.includes("WORKSHOP_REQUIRE_PUBLIC_ORIGIN=true")) {
  throw new Error("The production Workshop image must require an explicit public origin");
}
if (dockerfile.includes("widget-validator") || dockerfile.includes("build-workshop-validator")) {
  throw new Error("The Workshop image must not build or copy a submission validator");
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
  "users.passwordAuth = state.users.passwordAuth",
  "users.oauth2 = state.users.oauth2",
  "app.delete(users)",
]) {
  if (!migration.includes(required)) throw new Error(`Workshop rollback is missing state restoration: ${required}`);
}

for (const protectedField of [
  "email:changed",
  "displayName:changed",
  "avatarUrl:changed",
  "githubUsername:changed",
  "githubProfileUrl:changed",
]) {
  if (!migration.includes(protectedField)) {
    throw new Error(`Workshop OAuth identity field remains caller-controlled: ${protectedField}`);
  }
}
if (migration.includes("@request.body.avatar:changed")) {
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
  if (!migration.includes(protectedField)) {
    throw new Error(`Workshop moderators can still rewrite submissions: ${protectedField}`);
  }
}
for (const protectedField of ["category:changed", "explanation:changed"]) {
  if (!migration.includes(protectedField)) {
    throw new Error(`Workshop moderators can still rewrite reports: ${protectedField}`);
  }
}

const workflow = await read(".github/workflows/workshop.yml");
if (/\n\s+paths:/u.test(workflow)) throw new Error("Workshop workflow must not filter out Docker build inputs");

console.log("Workshop static contracts passed");
