/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const collection = new Collection({
      name: "marketplace",
      type: "view",
      listRule: "",
      viewRule: "",
      viewQuery: `
        SELECT
          s.id,
          s.type,
          s.title,
          s.description,
          s.schemaVersion,
          s.content,
          s.screenshots,
          s.version,
          s.changelog,
          s.author,
          s.created,
          s.updated,
          COALESCE(u.name, u.email, 'unknown') as authorName,
          COALESCE(SUM(CASE WHEN v.value = 1 THEN 1 ELSE 0 END), 0) as upvotes,
          COALESCE(SUM(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0) as downvotes,
          (SELECT COUNT(*) FROM comments c WHERE c.submission = s.id) as commentCount
        FROM submissions s
        LEFT JOIN users u ON u.id = s.author
        LEFT JOIN votes v ON v.submission = s.id
        GROUP BY s.id
      `,
    });
    app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("marketplace");
    app.delete(collection);
  },
);
