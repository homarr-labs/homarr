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

const withoutManagedRules = (rules) => rules.filter((rule) => !managedLabels.includes(rule.label));

migrate(
  (app) => {
    const settings = app.settings();
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
    settings.rateLimits.rules = [
      ...withoutManagedRules(settings.rateLimits.rules),
      { label: "submissions:create", audience: "@auth", duration: 60, maxRequests: 10 },
      { label: "votes:create", audience: "@auth", duration: 10, maxRequests: 20 },
      { label: "comments:create", audience: "@auth", duration: 60, maxRequests: 20 },
      { label: "reports:create", audience: "@auth", duration: 60, maxRequests: 5 },
    ];
    app.save(settings);
  },
);
