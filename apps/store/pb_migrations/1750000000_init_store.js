/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    const githubClientId = $os.getenv("GITHUB_CLIENT_ID");
    const githubClientSecret = $os.getenv("GITHUB_CLIENT_SECRET");
    users.oauth2.enabled = true;
    if (githubClientId && githubClientSecret) {
      users.oauth2.providers = [
        {
          name: "github",
          clientId: githubClientId,
          clientSecret: githubClientSecret,
        },
      ];
    }
    app.save(users);

    const submissions = new Collection({
      type: "base",
      name: "submissions",
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.id != ''",
      updateRule: "author = @request.auth.id",
      deleteRule: "author = @request.auth.id",
      fields: [
        { name: "type", type: "select", required: true, maxSelect: 1, values: ["css", "widget"] },
        { name: "title", type: "text", required: true, min: 3, max: 100 },
        { name: "description", type: "text", max: 2000 },
        { name: "schemaVersion", type: "text", required: true, max: 100 },
        { name: "content", type: "text", required: true, max: 1000000 },
        {
          name: "screenshots",
          type: "file",
          maxSelect: 5,
          maxSize: 5242880,
          mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
        },
        { name: "author", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: "upvotes", type: "number", onlyInt: true },
        { name: "downvotes", type: "number", onlyInt: true },
        { name: "version", type: "number", onlyInt: true },
        { name: "changelog", type: "text", max: 2000 },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    });
    app.save(submissions);

    const votes = new Collection({
      type: "base",
      name: "votes",
      listRule: "user = @request.auth.id",
      viewRule: "user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "user = @request.auth.id",
      deleteRule: "user = @request.auth.id",
      fields: [
        {
          name: "submission",
          type: "relation",
          required: true,
          maxSelect: 1,
          collectionId: submissions.id,
          cascadeDelete: true,
        },
        { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: "value", type: "number", required: true, onlyInt: true, min: -1, max: 1 },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    });
    votes.addIndex("idx_votes_unique_user_submission", true, "submission, user", "");
    app.save(votes);

    const reports = new Collection({
      type: "base",
      name: "reports",
      listRule: null,
      viewRule: null,
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: "submission",
          type: "relation",
          required: true,
          maxSelect: 1,
          collectionId: submissions.id,
          cascadeDelete: true,
        },
        { name: "user", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: "reason", type: "text", required: true, min: 3, max: 1000 },
        { name: "created", type: "autodate", onCreate: true },
      ],
    });
    app.save(reports);

    const comments = new Collection({
      type: "base",
      name: "comments",
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.id != ''",
      updateRule: "author = @request.auth.id",
      deleteRule: "author = @request.auth.id",
      fields: [
        {
          name: "submission",
          type: "relation",
          required: true,
          maxSelect: 1,
          collectionId: submissions.id,
          cascadeDelete: true,
        },
        { name: "author", type: "relation", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { name: "content", type: "text", required: true, min: 1, max: 2000 },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    });
    app.save(comments);
  },
  (app) => {
    for (const name of ["comments", "reports", "votes", "submissions"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch {
        // already gone
      }
    }
  },
);
