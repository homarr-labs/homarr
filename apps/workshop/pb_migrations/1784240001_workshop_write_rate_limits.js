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

const cloneJson = (value) => JSON.parse(JSON.stringify(value));
const withoutManagedRules = (rules) => rules.filter((rule) => !managedLabels.includes(rule.label));
const managedRules = (rules) => rules.filter((rule) => managedLabels.includes(rule.label));
const deriveLegacyWriteRateLimitState = (snapshot) => ({
  enabled: true,
  managedRules: managedRules([
    ...snapshot.rateLimits.rules.filter((rule) => !legacyCreateLabels.includes(rule.label)),
    ...legacyCreateRules,
  ]),
});

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
    throw new Error("Workshop write rate-limit migration state is unavailable");
  }
};

migrate(
  (app) => {
    const settings = app.settings();
    const state = findMigrationState(app);
    state.snapshot.writeRateLimits = {
      enabled: settings.rateLimits.enabled,
      managedRules: cloneJson(managedRules(settings.rateLimits.rules)),
    };
    state.record.set("snapshot", JSON.stringify(state.snapshot));
    app.save(state.record);

    settings.rateLimits.enabled = true;
    settings.rateLimits.rules = [
      ...withoutManagedRules(settings.rateLimits.rules),
      { label: "submissions:create", audience: "@auth", duration: 60, maxRequests: 10 },
      { label: "submissions:update", audience: "@auth", duration: 60, maxRequests: 30 },
      { label: "submissions:delete", audience: "@auth", duration: 60, maxRequests: 10 },
      { label: "votes:create", audience: "@auth", duration: 10, maxRequests: 20 },
      { label: "votes:update", audience: "@auth", duration: 10, maxRequests: 20 },
      { label: "votes:delete", audience: "@auth", duration: 10, maxRequests: 20 },
      { label: "comments:create", audience: "@auth", duration: 60, maxRequests: 20 },
      { label: "comments:update", audience: "@auth", duration: 60, maxRequests: 20 },
      { label: "comments:delete", audience: "@auth", duration: 60, maxRequests: 20 },
      { label: "reports:create", audience: "@auth", duration: 60, maxRequests: 5 },
      { label: "reports:update", audience: "@auth", duration: 60, maxRequests: 30 },
      { label: "reports:delete", audience: "@auth", duration: 60, maxRequests: 30 },
      { label: "users:update", audience: "@auth", duration: 60, maxRequests: 20 },
    ];
    app.save(settings);
  },
  (app) => {
    const settings = app.settings();
    const snapshot = findMigrationState(app).snapshot;
    const state = snapshot.writeRateLimits || deriveLegacyWriteRateLimitState(snapshot);
    if (!state || typeof state.enabled !== "boolean" || !Array.isArray(state.managedRules)) {
      throw new Error("Workshop write rate-limit rollback snapshot is missing or invalid");
    }
    settings.rateLimits.enabled = state.enabled;
    settings.rateLimits.rules = [...withoutManagedRules(settings.rateLimits.rules), ...cloneJson(state.managedRules)];
    app.save(settings);
  },
);
