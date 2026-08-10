/// <reference path="../pb_data/types.d.ts" />

const reportReaderRule = "@request.auth.id != '' && (author = @request.auth.id || @request.auth.isAdmin = true)";

migrate(
  (app) => {
    const summaries = new Collection({
      type: "view",
      name: "workshop_report_summaries",
      listRule: reportReaderRule,
      viewRule: reportReaderRule,
      viewQuery: `
        SELECT r.id, r.submission, s.author, r.category, r.explanation, r.created
        FROM reports r
        INNER JOIN submissions s ON s.id = r.submission
        WHERE r.status = 'open'
      `,
    });
    app.save(summaries);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("workshop_report_summaries"));
  },
);
