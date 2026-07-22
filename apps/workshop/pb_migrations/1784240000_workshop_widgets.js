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
    if (!users.fields.getByName("avatar"))
      users.fields.add(
        new FileField({
          name: "avatar",
          maxSelect: 1,
          maxSize: 2_097_152,
          mimeTypes: ["image/png", "image/jpeg", "image/webp"],
        }),
      );
    if (!users.fields.getByName("githubUsername"))
      users.fields.add(new TextField({ name: "githubUsername", max: 100 }));
    if (!users.fields.getByName("githubProfileUrl")) users.fields.add(new URLField({ name: "githubProfileUrl" }));
    if (!users.fields.getByName("isAdmin")) users.fields.add(new BoolField({ name: "isAdmin" }));

    const githubClientId = $os.getenv("GITHUB_CLIENT_ID");
    const githubClientSecret = $os.getenv("GITHUB_CLIENT_SECRET");
    if (githubClientId && githubClientSecret) {
      users.oauth2.enabled = true;
      users.oauth2.providers = [{ name: "github", clientId: githubClientId, clientSecret: githubClientSecret }];
    }

    const adminRule = "@request.auth.isAdmin = true";
    users.listRule = "";
    users.viewRule = "";
    users.createRule = '@request.context = "oauth2" && @request.body.isAdmin:isset = false';
    users.updateRule = "id = @request.auth.id && @request.body.isAdmin:isset = false";
    users.deleteRule = null;
    app.save(users);

    const submissions = new Collection({
      type: "base",
      name: "submissions",
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.id != '' && @request.body.author = @request.auth.id",
      updateRule: `(author = @request.auth.id || ${adminRule}) && @request.body.author:changed = false && @request.body.type:changed = false && @request.body.widgetSchema:changed = false`,
      deleteRule: `author = @request.auth.id || ${adminRule}`,
      fields: [
        { type: "select", name: "type", required: true, maxSelect: 1, values: ["customWidget", "customCss"] },
        { type: "text", name: "title", required: true, min: 3, max: 100 },
        { type: "text", name: "description", max: 2000 },
        { type: "text", name: "widgetSchema", required: true, min: 1, max: 100 },
        { type: "text", name: "content", required: true, max: 1000000 },
        { type: "number", name: "revision", required: true, onlyInt: true, min: 1 },
        { type: "text", name: "changelog", max: 2000 },
        { type: "bool", name: "outdated" },
        {
          type: "file",
          name: "screenshots",
          maxSelect: 5,
          maxSize: 5242880,
          mimeTypes: ["image/png", "image/jpeg", "image/webp"],
          thumbs: ["480x320", "960x640"],
        },
        { type: "relation", name: "author", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
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
      createRule:
        "@request.auth.id != '' && @request.body.user = @request.auth.id && (@request.body.value = 1 || @request.body.value = -1)",
      updateRule:
        "user = @request.auth.id && @request.body.user:changed = false && @request.body.submission:changed = false && (@request.body.value = 1 || @request.body.value = -1)",
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

    const comments = new Collection({
      type: "base",
      name: "comments",
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.id != '' && @request.body.author = @request.auth.id",
      updateRule:
        "author = @request.auth.id && @request.body.author:changed = false && @request.body.submission:changed = false",
      deleteRule: `author = @request.auth.id || ${adminRule}`,
      fields: [
        {
          type: "relation",
          name: "submission",
          required: true,
          maxSelect: 1,
          collectionId: submissions.id,
          cascadeDelete: true,
        },
        { type: "relation", name: "author", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { type: "text", name: "content", required: true, min: 1, max: 2000 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
    });
    comments.addIndex("idx_comments_submission", false, "submission", "");
    app.save(comments);

    const reports = new Collection({
      type: "base",
      name: "reports",
      listRule: adminRule,
      viewRule: adminRule,
      createRule: "@request.auth.id != '' && @request.body.reporter = @request.auth.id",
      updateRule: `${adminRule} && @request.body.reporter:changed = false && @request.body.submission:changed = false`,
      deleteRule: adminRule,
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
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
    });
    reports.addIndex("idx_reports_reporter_submission", true, "reporter, submission", "");
    reports.addIndex("idx_reports_created", false, "created", "");
    app.save(reports);

    const listings = new Collection({
      type: "view",
      name: "workshop_listings",
      listRule: "",
      viewRule: "",
      viewQuery: `
        SELECT s.id, s.type, s.title, s.description, s.widgetSchema, s.screenshots, s.author,
          u.displayName AS authorName, u.avatarUrl AS authorAvatarUrl,
          u.githubUsername AS authorGithubUsername, u.githubProfileUrl AS authorGithubProfileUrl,
          s.revision, s.changelog, s.outdated, s.created, s.updated,
          COALESCE((SELECT COUNT(*) FROM votes v WHERE v.submission = s.id AND v.value = 1), 0) AS upvotes,
          COALESCE((SELECT COUNT(*) FROM votes v WHERE v.submission = s.id AND v.value = -1), 0) AS downvotes,
          COALESCE((SELECT SUM(v.value) FROM votes v WHERE v.submission = s.id), 0) AS score,
          COALESCE((SELECT COUNT(*) FROM comments c WHERE c.submission = s.id), 0) AS commentCount,
          COALESCE((SELECT COUNT(*) FROM reports r WHERE r.submission = s.id AND r.status = 'open'), 0) AS reportCount
        FROM submissions s
        JOIN users u ON u.id = s.author
      `,
    });
    app.save(listings);

    const settings = app.settings();
    settings.rateLimits.enabled = true;
    settings.rateLimits.rules = [
      ...settings.rateLimits.rules.filter(
        (rule) => !["submissions:create", "votes:create", "comments:create", "reports:create"].includes(rule.label),
      ),
      { label: "submissions:create", audience: "@auth", duration: 60, maxRequests: 10 },
      { label: "votes:create", audience: "@auth", duration: 10, maxRequests: 20 },
      { label: "comments:create", audience: "@auth", duration: 60, maxRequests: 20 },
      { label: "reports:create", audience: "@auth", duration: 60, maxRequests: 5 },
    ];
    app.save(settings);
  },
  (app) => {
    for (const name of ["workshop_listings", "reports", "comments", "votes", "submissions"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch {}
    }
  },
);
