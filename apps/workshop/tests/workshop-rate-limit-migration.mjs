import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const normalized = (value) => JSON.parse(JSON.stringify(value));
const managedLabels = [
  "submissions:create",
  "submissions:update",
  "submissions:delete",
  "votes:create",
  "votes:update",
  "votes:delete",
  "comments:create",
  "comments:update",
  "comments:delete",
  "reports:create",
  "reports:update",
  "reports:delete",
  "users:update",
];
const originalManagedRules = managedLabels.map((label, index) => ({
  label,
  audience: index % 2 === 0 ? "@auth" : "",
  duration: index + 1,
  maxRequests: index + 10,
}));
const originalUnmanagedRule = {
  label: "unrelated:create",
  audience: "",
  duration: 41,
  maxRequests: 42,
};
const stateCollection = { id: "workshop_migration_state" };
let stateSnapshot = JSON.stringify({ marker: "retain-existing-migration-state" });
const stateRecord = {
  getString(name) {
    assert.equal(name, "snapshot");
    return stateSnapshot;
  },
  set(name, value) {
    assert.equal(name, "snapshot");
    stateSnapshot = value;
  },
};
const settings = {
  rateLimits: {
    enabled: false,
    rules: [originalUnmanagedRule, ...originalManagedRules],
  },
};
const app = {
  findCollectionByNameOrId(name) {
    if (name !== stateCollection.id) throw new Error(`Missing collection ${name}`);
    return stateCollection;
  },
  findFirstRecordByFilter(collectionId) {
    if (collectionId !== stateCollection.id) throw new Error(`Missing state record ${collectionId}`);
    return stateRecord;
  },
  save() {},
  settings() {
    return settings;
  },
};

const loadMigration = async (path) => {
  let loaded;
  const source = await readFile(path, "utf8");
  vm.runInNewContext(source, {
    console,
    migrate: (up, down) => {
      loaded = { up, down };
    },
  });
  if (!loaded) throw new Error(`Workshop migration did not register: ${path}`);
  return loaded;
};

const migration = await loadMigration("apps/workshop/pb_migrations/1784240001_workshop_write_rate_limits.js");

migration.up(app);
const savedState = JSON.parse(stateSnapshot);
assert.equal(savedState.marker, "retain-existing-migration-state");
assert.deepEqual(savedState.writeRateLimits, {
  enabled: false,
  managedRules: originalManagedRules,
});
assert.equal(settings.rateLimits.enabled, true);
assert.deepEqual(
  normalized(settings.rateLimits.rules.filter((rule) => !managedLabels.includes(rule.label))),
  [originalUnmanagedRule],
  "Applying Workshop rate limits changed unrelated rules",
);
assert.deepEqual(
  new Set(settings.rateLimits.rules.map((rule) => rule.label)),
  new Set([...managedLabels, originalUnmanagedRule.label]),
  "Applying Workshop rate limits did not replace every managed label",
);

const laterUnmanagedRule = {
  label: "added-after-migration:update",
  audience: "@auth",
  duration: 51,
  maxRequests: 52,
};
settings.rateLimits.rules = [
  laterUnmanagedRule,
  ...settings.rateLimits.rules.filter((rule) => managedLabels.includes(rule.label)),
];
migration.down(app);

assert.equal(settings.rateLimits.enabled, false, "Rollback did not restore the original enabled flag");
assert.deepEqual(
  normalized(settings.rateLimits.rules.filter((rule) => !managedLabels.includes(rule.label))),
  [laterUnmanagedRule],
  "Rollback changed unrelated rules added after the migration",
);
assert.deepEqual(
  normalized(settings.rateLimits.rules.filter((rule) => managedLabels.includes(rule.label))),
  originalManagedRules,
  "Rollback did not restore every original managed-label rule",
);

assert.throws(
  () =>
    migration.up({
      ...app,
      findCollectionByNameOrId() {
        throw new Error("missing");
      },
    }),
  /migration state is unavailable/u,
  "Migration must fail closed when its persistent rollback snapshot is unavailable",
);

const legacyOriginalRules = [
  { label: "unrelated:create", audience: "", duration: 71, maxRequests: 72 },
  { label: "submissions:create", audience: "", duration: 73, maxRequests: 74 },
  { label: "comments:update", audience: "@auth", duration: 75, maxRequests: 76 },
];
const legacyStateCollection = { id: "workshop_migration_state" };
let legacyStateSnapshot = JSON.stringify({
  marker: "already-applied-old-0001",
  rateLimits: { enabled: false, rules: legacyOriginalRules },
});
const legacyStateRecord = {
  getString() {
    return legacyStateSnapshot;
  },
  set(_name, value) {
    legacyStateSnapshot = value;
  },
};
const legacySettings = {
  rateLimits: {
    enabled: true,
    rules: [
      { label: "unrelated:create", audience: "", duration: 71, maxRequests: 72 },
      ...managedLabels.map((label) => ({ label, audience: "@auth", duration: 60, maxRequests: 30 })),
    ],
  },
};
const legacyApp = {
  findCollectionByNameOrId() {
    return legacyStateCollection;
  },
  findFirstRecordByFilter() {
    return legacyStateRecord;
  },
  save() {},
  settings() {
    return legacySettings;
  },
};
const compatibilityMigration = await loadMigration(
  "apps/workshop/pb_migrations/1784240003_workshop_rate_limit_rollback_compatibility.js",
);
compatibilityMigration.up(legacyApp);
compatibilityMigration.down(legacyApp);

const backfilledState = JSON.parse(legacyStateSnapshot);
assert.equal(backfilledState.marker, "already-applied-old-0001");
assert.deepEqual(backfilledState.writeRateLimits, {
  enabled: true,
  managedRules: [
    { label: "comments:update", audience: "@auth", duration: 75, maxRequests: 76 },
    { label: "submissions:create", audience: "@auth", duration: 60, maxRequests: 10 },
    { label: "votes:create", audience: "@auth", duration: 10, maxRequests: 20 },
    { label: "comments:create", audience: "@auth", duration: 60, maxRequests: 20 },
    { label: "reports:create", audience: "@auth", duration: 60, maxRequests: 5 },
  ],
});

migration.down(legacyApp);
assert.equal(legacySettings.rateLimits.enabled, true);
assert.deepEqual(
  normalized(legacySettings.rateLimits.rules),
  [
    { label: "unrelated:create", audience: "", duration: 71, maxRequests: 72 },
    ...backfilledState.writeRateLimits.managedRules,
  ],
  "An already-applied legacy migration could not be rolled back after the compatibility backfill",
);

console.log("Workshop write rate-limit migration restoration passed");
