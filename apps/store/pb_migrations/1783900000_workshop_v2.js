/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    let users;
    try {
      users = app.findCollectionByNameOrId("users");
    } catch {
      users = new Collection({
        type: "auth",
        name: "users",
        listRule: "@request.auth.role = 'moderator' || @request.auth.role = 'admin'",
        viewRule: "id = @request.auth.id || @request.auth.role = 'moderator' || @request.auth.role = 'admin'",
        updateRule: "id = @request.auth.id && @request.auth.state != 'disabled'",
        deleteRule: null,
        passwordAuth: { enabled: false },
      });
    }
    // PocketBase creates a default users auth collection on first boot, so
    // Workshop fields must be added to the existing collection explicitly.
    users.fields.add(
      new TextField({ name: "displayName", required: true, min: 1, max: 100 }),
      new URLField({ name: "avatarUrl" }),
      new SelectField({ name: "role", required: true, maxSelect: 1, values: ["member", "moderator", "admin"] }),
      new SelectField({
        name: "state",
        required: true,
        maxSelect: 1,
        values: ["active", "posting_banned", "disabled"],
      }),
      new TextField({ name: "moderationReason", max: 1000 }),
    );
    const githubClientId = $os.getenv("GITHUB_CLIENT_ID");
    const githubClientSecret = $os.getenv("GITHUB_CLIENT_SECRET");
    users.oauth2.enabled = Boolean(githubClientId && githubClientSecret);
    users.oauth2.providers =
      githubClientId && githubClientSecret
        ? [{ name: "github", clientId: githubClientId, clientSecret: githubClientSecret }]
        : [];
    app.save(users);

    const staffRule = "@request.auth.role = 'moderator' || @request.auth.role = 'admin'";
    const writableRule = "@request.auth.id != '' && @request.auth.state != 'disabled'";
    const authorRule = "author = @request.auth.id && @request.auth.state = 'active'";

    const submissions = new Collection({
      type: "base",
      name: "submissions",
      // Full source is intentionally available only through getOne; discovery
      // must use workshop_listings so list payloads never contain content.
      listRule: null,
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { type: "select", name: "type", required: true, maxSelect: 1, values: ["widget", "css"] },
        { type: "text", name: "title", required: true, min: 3, max: 100 },
        { type: "text", name: "description", max: 2000 },
        { type: "text", name: "schemaVersion", required: true, max: 100 },
        { type: "text", name: "content", required: true, max: 1000000 },
        {
          type: "file",
          name: "screenshots",
          maxSelect: 5,
          maxSize: 5242880,
          mimeTypes: ["image/png", "image/jpeg", "image/webp"],
          thumbs: ["480x320", "960x640"],
        },
        {
          type: "relation",
          name: "author",
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true,
        },
        { type: "text", name: "authorName", required: true, max: 100 },
        { type: "number", name: "revision", required: true, onlyInt: true, min: 1 },
        { type: "text", name: "changelog", max: 2000 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
    });
    app.save(submissions);
    submissions.createRule = "@request.auth.id != ''";
    submissions.updateRule = authorRule;
    submissions.deleteRule = authorRule;
    submissions.addIndex("idx_submissions_author", false, "author", "");
    submissions.addIndex("idx_submissions_type_created", false, "type, created", "");
    app.save(submissions);

    const votes = new Collection({
      type: "base",
      name: "votes",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
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
        { type: "relation", name: "user", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { type: "number", name: "value", required: true, onlyInt: true, min: -1, max: 1 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
    });
    app.save(votes);
    votes.listRule = "user = @request.auth.id";
    votes.viewRule = "user = @request.auth.id";
    votes.createRule = writableRule;
    votes.updateRule = "user = @request.auth.id && @request.auth.state != 'disabled'";
    votes.deleteRule = "user = @request.auth.id && @request.auth.state != 'disabled'";
    votes.addIndex("idx_votes_user_submission", true, "user, submission", "");
    votes.addIndex("idx_votes_submission", false, "submission", "");
    app.save(votes);

    const reports = new Collection({
      type: "base",
      name: "reports",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
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
        { type: "select", name: "status", required: true, maxSelect: 1, values: ["open", "resolved", "dismissed"] },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
    });
    app.save(reports);
    reports.listRule = staffRule;
    reports.viewRule = staffRule;
    reports.createRule = writableRule;
    reports.addIndex("idx_reports_reporter_submission", true, "reporter, submission", "");
    reports.addIndex("idx_reports_status_created", false, "status, created", "");
    app.save(reports);

    const moderationActions = new Collection({
      type: "base",
      name: "moderation_actions",
      listRule: staffRule,
      viewRule: staffRule,
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
          values: ["remove_submission", "set_account_state", "set_role", "resolve_report"],
        },
        { type: "text", name: "targetType", required: true, max: 30 },
        { type: "text", name: "targetId", required: true, max: 30 },
        { type: "text", name: "reason", required: true, min: 3, max: 1000 },
        { type: "text", name: "snapshot", max: 100000 },
        { type: "autodate", name: "created", onCreate: true },
      ],
    });
    app.save(moderationActions);
    moderationActions.addIndex("idx_moderation_actions_created", false, "created", "");
    app.save(moderationActions);

    const listings = new Collection({
      type: "view",
      name: "workshop_listings",
      listRule: "",
      viewRule: "",
      viewQuery: `
        SELECT s.id, s.type, s.title, s.description, s.schemaVersion, s.screenshots,
          s.revision, s.changelog, s.author, s.authorName, s.created, s.updated,
          COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
          COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
          COALESCE(SUM(v.value), 0) AS score
        FROM submissions s
        LEFT JOIN votes v ON v.submission = s.id
        GROUP BY s.id
      `,
    });
    app.save(listings);

    const settings = app.settings();
    settings.rateLimits.enabled = true;
    settings.rateLimits.rules = [
      { label: "*:auth", audience: "", duration: 60, maxRequests: 10 },
      { label: "submissions:create", audience: "@auth", duration: 60, maxRequests: 10 },
      { label: "votes:create", audience: "@auth", duration: 10, maxRequests: 20 },
      { label: "reports:create", audience: "@auth", duration: 60, maxRequests: 5 },
      { label: "/api/workshop/moderation/", audience: "@auth", duration: 60, maxRequests: 30 },
      { label: "/api/", audience: "", duration: 10, maxRequests: 300 },
    ];
    settings.logs.maxDays = 30;
    settings.logs.logAuthId = true;
    settings.logs.logIP = true;
    app.save(settings);
  },
  (app) => {
    // PocketBase creates the users auth collection before this migration. Keep
    // it intact on rollback so reverting Workshop can never delete accounts.
    for (const name of ["workshop_listings", "moderation_actions", "reports", "votes", "submissions"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch {
        // Collection was not created or was already removed.
      }
    }
    const settings = app.settings();
    settings.rateLimits.enabled = false;
    settings.rateLimits.rules = [];
    app.save(settings);
  },
);
