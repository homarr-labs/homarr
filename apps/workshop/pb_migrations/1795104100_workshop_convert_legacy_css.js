migrate(
  (app) => {
    app
      .db()
      .newQuery(
        `UPDATE submissions
         SET type = 'customTheme', widgetSchema = 'homarr-custom-theme-v1',
             content = json_object('preset', 'default', 'theme', json('{}'), 'customCss', content),
             expectedRevision = revision, revision = revision + 1
         WHERE type = 'customCss'`,
      )
      .execute();
  },
  (app) => {
    if (app.findRecordsByFilter("submissions", "type = 'customTheme'", "", 1, 0).length > 0) {
      throw new Error("Restore the pre-migration Workshop backup to roll back while custom themes exist");
    }
  },
);
