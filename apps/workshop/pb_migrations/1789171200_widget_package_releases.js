/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const submissions = app.findCollectionByNameOrId("submissions");
    submissions.fields.getByName("content").max = 20_000_000;
    app.save(submissions);
    const users = app.findCollectionByNameOrId("users");
    const releases = new Collection({
      type: "base",
      name: "widget_releases",
      listRule: "",
      viewRule: "",
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
        { type: "relation", name: "author", required: true, maxSelect: 1, collectionId: users.id, cascadeDelete: true },
        { type: "text", name: "packageId", required: true, max: 128 },
        { type: "text", name: "version", required: true, max: 128 },
        { type: "text", name: "sdkVersion", required: true, max: 64 },
        { type: "text", name: "sourceDigest", required: true, min: 64, max: 64 },
        { type: "text", name: "artifactDigest", max: 64 },
        { type: "text", name: "content", required: true, max: 20_000_000 },
        { type: "text", name: "artifact", max: 80_000_000 },
        { type: "text", name: "changelog", max: 2000 },
        { type: "text", name: "forkedFrom", max: 64 },
        { type: "autodate", name: "created", onCreate: true },
      ],
    });
    releases.addIndex("idx_widget_releases_submission_version", true, "submission, version", "");
    releases.addIndex("idx_widget_releases_package", false, "packageId, created", "");
    app.save(releases);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("widget_releases"));
    // Keep the enlarged content limit so rollback does not truncate published source.
  },
);
