/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    let users;
    try {
      users = app.findCollectionByNameOrId("users");
    } catch {
      users = new Collection({ type: "auth", name: "users" });
    }
    users.passwordAuth = { enabled: false };
    if (!users.fields.getByName("displayName"))
      users.fields.add(new TextField({ name: "displayName", required: true, min: 1, max: 100 }));
    if (!users.fields.getByName("avatarUrl")) users.fields.add(new URLField({ name: "avatarUrl" }));
    app.save(users);

    const admins = new Collection({
      type: "base",
      name: "workshop_admins",
      listRule: "user = @request.auth.id",
      viewRule: "user = @request.auth.id",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { type: "relation", name: "user", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { type: "autodate", name: "created", onCreate: true },
      ],
    });
    admins.addIndex("idx_workshop_admin_user", true, "user", "");
    app.save(admins);
    const adminRule = "@collection.workshop_admins.user ?= @request.auth.id";
    users.listRule = adminRule;
    users.viewRule = `id = @request.auth.id || ${adminRule}`;
    users.updateRule = "id = @request.auth.id";
    users.deleteRule = null;
    app.save(users);

    const submissions = new Collection({
      type: "base",
      name: "submissions",
      listRule: adminRule,
      viewRule: "",
      createRule: "@request.auth.id != '' && @request.body.author = @request.auth.id",
      updateRule: "author = @request.auth.id",
      deleteRule: `author = @request.auth.id || ${adminRule}`,
      fields: [
        { type: "text", name: "title", required: true, min: 3, max: 100 },
        { type: "text", name: "description", max: 2000 },
        { type: "text", name: "content", required: true, max: 1000000 },
        { type: "text", name: "contentHash", required: true, max: 64 },
        {
          type: "file",
          name: "screenshots",
          maxSelect: 5,
          maxSize: 5242880,
          mimeTypes: ["image/png", "image/jpeg", "image/webp"],
          thumbs: ["480x320", "960x640"],
        },
        { type: "relation", name: "author", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { type: "text", name: "authorName", required: true, max: 100 },
        { type: "number", name: "revision", required: true, onlyInt: true, min: 1 },
        { type: "text", name: "changelog", max: 2000 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
    });
    submissions.addIndex("idx_submissions_author", false, "author", "");
    submissions.addIndex("idx_submissions_created", false, "created", "");
    app.save(submissions);

    const votes = new Collection({
      type: "base",
      name: "votes",
      listRule: "user = @request.auth.id",
      viewRule: "user = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.user = @request.auth.id",
      updateRule: "user = @request.auth.id",
      deleteRule: "user = @request.auth.id",
      fields: [
        {
          type: "relation",
          name: "submission",
          required: true,
          maxSelect: 1,
          collectionId: submissions.id,
          cascadeDelete: true,
        },
        { type: "relation", name: "user", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { type: "number", name: "value", required: true, onlyInt: true, min: -1, max: 1 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
    });
    votes.addIndex("idx_votes_user_submission", true, "user, submission", "");
    votes.addIndex("idx_votes_submission", false, "submission", "");
    app.save(votes);

    const reports = new Collection({
      type: "base",
      name: "reports",
      listRule: adminRule,
      viewRule: `reporter = @request.auth.id || ${adminRule}`,
      createRule: "@request.auth.id != '' && @request.body.reporter = @request.auth.id",
      updateRule: adminRule,
      deleteRule: null,
      fields: [
        {
          type: "relation",
          name: "submission",
          required: true,
          maxSelect: 1,
          collectionId: submissions.id,
          cascadeDelete: true,
        },
        {
          type: "relation",
          name: "reporter",
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true,
        },
        {
          type: "select",
          name: "category",
          required: true,
          maxSelect: 1,
          values: ["malicious", "spam", "copyright", "inappropriate", "other"],
        },
        { type: "text", name: "explanation", required: true, min: 3, max: 1000 },
        { type: "select", name: "status", required: true, maxSelect: 1, values: ["open", "dismissed"] },
        { type: "text", name: "dismissalReason", max: 1000 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
    });
    reports.addIndex("idx_reports_reporter_submission", true, "reporter, submission", "");
    reports.addIndex("idx_reports_status_created", false, "status, created", "");
    app.save(reports);

    const actions = new Collection({
      type: "base",
      name: "workshop_admin_actions",
      listRule: adminRule,
      viewRule: adminRule,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { type: "relation", name: "actor", required: true, maxSelect: 1, collectionId: users.id },
        {
          type: "select",
          name: "action",
          required: true,
          maxSelect: 1,
          values: ["delete_submission", "dismiss_report"],
        },
        { type: "text", name: "submissionId", max: 30 },
        { type: "text", name: "reportId", max: 30 },
        { type: "text", name: "reason", max: 1000 },
        { type: "text", name: "snapshot", max: 100000 },
        { type: "autodate", name: "created", onCreate: true },
      ],
    });
    actions.addIndex("idx_workshop_admin_actions_created", false, "created", "");
    app.save(actions);

    const listings = new Collection({
      type: "view",
      name: "workshop_listings",
      listRule: "",
      viewRule: "",
      viewQuery: `
        SELECT s.id, s.title, s.description, s.contentHash, s.screenshots,
          s.revision, s.changelog, s.author, s.authorName, s.created, s.updated,
          COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
          COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
          COALESCE(SUM(v.value), 0) AS score
        FROM submissions s LEFT JOIN votes v ON v.submission = s.id GROUP BY s.id
      `,
    });
    app.save(listings);

    const settings = app.settings();
    settings.rateLimits.enabled = true;
    settings.rateLimits.rules = [
      ...settings.rateLimits.rules.filter(
        (rule) => !["submissions:create", "votes:create", "reports:create"].includes(rule.label),
      ),
      { label: "submissions:create", audience: "@auth", duration: 60, maxRequests: 10 },
      { label: "votes:create", audience: "@auth", duration: 10, maxRequests: 20 },
      { label: "reports:create", audience: "@auth", duration: 60, maxRequests: 5 },
    ];
    app.save(settings);
  },
  (app) => {
    for (const name of [
      "workshop_listings",
      "workshop_admin_actions",
      "reports",
      "votes",
      "submissions",
      "workshop_admins",
    ]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch {}
    }
  },
);
