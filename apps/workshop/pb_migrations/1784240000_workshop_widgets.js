/// <reference path="../pb_data/types.d.ts" />

const cloneJson = (value) => JSON.parse(JSON.stringify(value));
const cloneRule = (value) => (value === null ? null : String(value));
const adminRule = "@request.auth.isAdmin = true";
const identityFieldsUnchanged = ["@request.body.email:changed = false", "@request.body.name:changed = false"].join(
  " && ",
);
const immutableSubmissionFields = [
  "@request.body.author:changed = false",
  "@request.body.type:changed = false",
  "@request.body.widgetSchema:changed = false",
].join(" && ");
const moderatorSubmissionFieldsUnchanged = [
  "@request.body.title:changed = false",
  "@request.body.description:changed = false",
  "@request.body.content:changed = false",
  "@request.body.changelog:changed = false",
  "@request.body.screenshots:changed = false",
].join(" && ");

migrate(
  (app) => {
    let usersExisted = true;
    let users;
    try {
      users = app.findCollectionByNameOrId("users");
    } catch {
      usersExisted = false;
      users = new Collection({ type: "auth", name: "users" });
    }

    const stateCollection = new Collection({
      type: "base",
      name: "workshop_migration_state",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [{ type: "text", name: "snapshot", required: true, max: 1_000_000 }],
    });
    app.save(stateCollection);
    const state = {
      usersExisted,
      users: usersExisted
        ? {
            passwordAuth: cloneJson(users.passwordAuth),
            oauth2: cloneJson(users.oauth2),
            listRule: cloneRule(users.listRule),
            viewRule: cloneRule(users.viewRule),
            createRule: cloneRule(users.createRule),
            updateRule: cloneRule(users.updateRule),
            deleteRule: cloneRule(users.deleteRule),
          }
        : null,
      addedUserFields: [],
    };
    const addUserField = (field) => {
      if (users.fields.getByName(field.name)) return;
      users.fields.add(field);
      state.addedUserFields.push(field.name);
    };

    users.passwordAuth = { enabled: false };
    addUserField(new TextField({ name: "name", required: true, min: 1, max: 39 }));
    addUserField(new BoolField({ name: "isAdmin" }));

    users.listRule = "";
    users.viewRule = "";
    users.createRule = '@request.context = "oauth2" && @request.body.isAdmin:isset = false';
    users.updateRule = `id = @request.auth.id && @request.body.isAdmin:isset = false && ${identityFieldsUnchanged}`;
    users.deleteRule = null;
    app.save(users);
    const stateRecord = new Record(stateCollection);
    stateRecord.set("snapshot", JSON.stringify(state));
    app.save(stateRecord);

    const submissions = new Collection({
      type: "base",
      name: "submissions",
      listRule: "",
      viewRule: "",
      createRule: "@request.auth.id != '' && @request.body.author = @request.auth.id",
      updateRule:
        `(author = @request.auth.id && ${immutableSubmissionFields}) || ` +
        `(${adminRule} && author != @request.auth.id && ${immutableSubmissionFields} && ${moderatorSubmissionFieldsUnchanged})`,
      deleteRule: `author = @request.auth.id || ${adminRule}`,
      fields: [
        { type: "select", name: "type", required: true, maxSelect: 1, values: ["customWidget", "customCss"] },
        { type: "text", name: "title", required: true, min: 3, max: 100 },
        { type: "text", name: "description", max: 2000 },
        { type: "text", name: "widgetSchema", required: true, min: 1, max: 100 },
        { type: "text", name: "content", required: true, max: 1000000 },
        { type: "number", name: "revision", required: true, onlyInt: true, min: 1 },
        { type: "number", name: "expectedRevision", onlyInt: true, min: 0 },
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
    app
      .db()
      .newQuery(
        `CREATE TRIGGER submissions_revision_cas
         BEFORE UPDATE ON submissions
         FOR EACH ROW
         WHEN NEW.expectedRevision != OLD.revision OR NEW.revision != OLD.revision + 1
         BEGIN
           SELECT RAISE(ABORT, 'submission revision compare-and-swap failed');
         END`,
      )
      .execute();

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
      updateRule:
        `${adminRule} && ` +
        "@request.body.reporter:changed = false && " +
        "@request.body.submission:changed = false && " +
        "@request.body.category:changed = false && " +
        "@request.body.explanation:changed = false",
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
          u.name AS authorName,
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
  },
  (app) => {
    let stateCollection;
    let stateRecord;
    try {
      stateCollection = app.findCollectionByNameOrId("workshop_migration_state");
      stateRecord = app.findFirstRecordByFilter(stateCollection.id, "");
    } catch {
      throw new Error("Workshop migration cannot be rolled back safely because its state snapshot is missing");
    }
    const state = JSON.parse(stateRecord.getString("snapshot"));
    for (const name of ["workshop_listings", "reports", "comments", "votes", "submissions"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch {}
    }

    const users = app.findCollectionByNameOrId("users");
    if (state.usersExisted) {
      users.passwordAuth = state.users.passwordAuth;
      users.oauth2 = state.users.oauth2;
      users.listRule = state.users.listRule;
      users.viewRule = state.users.viewRule;
      users.createRule = state.users.createRule;
      users.updateRule = state.users.updateRule;
      users.deleteRule = state.users.deleteRule;
      for (const name of state.addedUserFields) {
        const field = users.fields.getByName(name);
        if (field) users.fields.removeById(field.id);
      }
      app.save(users);
    } else {
      app.delete(users);
    }
    app.delete(stateCollection);
  },
);
