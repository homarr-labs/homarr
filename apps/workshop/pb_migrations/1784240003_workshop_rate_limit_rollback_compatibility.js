/// <reference path="../pb_data/types.d.ts" />

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
const legacyCreateRules = [
  { label: "submissions:create", audience: "@auth", duration: 60, maxRequests: 10 },
  { label: "votes:create", audience: "@auth", duration: 10, maxRequests: 20 },
  { label: "comments:create", audience: "@auth", duration: 60, maxRequests: 20 },
  { label: "reports:create", audience: "@auth", duration: 60, maxRequests: 5 },
];
const legacyCreateLabels = legacyCreateRules.map((rule) => rule.label);
const managedRules = (rules) => rules.filter((rule) => managedLabels.includes(rule.label));

const findMigrationState = (app) => {
  try {
    const collection = app.findCollectionByNameOrId("workshop_migration_state");
    const record = app.findFirstRecordByFilter(collection.id, "");
    const snapshot = JSON.parse(record.getString("snapshot"));
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
      throw new Error("Workshop migration state snapshot is invalid");
    }
    return { record, snapshot };
  } catch {
    throw new Error("Workshop rate-limit compatibility state is unavailable");
  }
};

migrate(
  (app) => {
    const state = findMigrationState(app);
    if (state.snapshot.writeRateLimits) return;
    if (!state.snapshot.rateLimits || !Array.isArray(state.snapshot.rateLimits.rules)) {
      throw new Error("Workshop legacy rate-limit snapshot is missing or invalid");
    }
    state.snapshot.writeRateLimits = {
      enabled: true,
      managedRules: managedRules([
        ...state.snapshot.rateLimits.rules.filter((rule) => !legacyCreateLabels.includes(rule.label)),
        ...legacyCreateRules,
      ]),
    };
    state.record.set("snapshot", JSON.stringify(state.snapshot));
    app.save(state.record);
  },
  () => {
    // Keep the backfill until 1784240001 is rolled back; 1784240000 removes the state collection afterward.
  },
);
