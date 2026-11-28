migrate(
  (app) => {
    const submissions = app.findCollectionByNameOrId("submissions");
    const type = submissions.fields.getByName("type");
    type.values = [...type.values, "customTheme"];
    app.save(submissions);
  },
  (app) => {
    const submissions = app.findCollectionByNameOrId("submissions");
    if (app.findRecordsByFilter(submissions.id, "type = 'customTheme'", "", 1, 0).length > 0) {
      throw new Error("Cannot roll back Workshop custom themes while theme submissions exist");
    }
    const type = submissions.fields.getByName("type");
    type.values = type.values.filter((value) => value !== "customTheme");
    app.save(submissions);
  },
);
