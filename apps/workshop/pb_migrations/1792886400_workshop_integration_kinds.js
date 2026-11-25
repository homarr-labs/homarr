migrate(
  (app) => {
    app.runInTransaction((txApp) => {
      const { getSubmissionIntegrationKinds } = require(`${__hooks}/workshop-utils.js`);
      const submissions = txApp.findCollectionByNameOrId("submissions");
      submissions.fields.add(new JSONField({ name: "integrationKinds", maxSize: 2048 }));
      txApp.save(submissions);

      const listings = txApp.findCollectionByNameOrId("workshop_listings");
      if (!listings.viewQuery.includes("s.widgetSchema,")) {
        throw new Error("Workshop listing query is missing its widgetSchema column");
      }
      listings.viewQuery = listings.viewQuery.replace("s.widgetSchema,", "s.widgetSchema, s.integrationKinds,");
      txApp.save(listings);

      let offset = 0;
      while (true) {
        const records = txApp.findRecordsByFilter(submissions.id, "", "id", 200, offset);
        if (records.length === 0) break;
        for (const record of records) {
          const revision = record.getInt("revision");
          record.set("integrationKinds", getSubmissionIntegrationKinds(record));
          record.set("expectedRevision", revision);
          record.set("revision", revision + 1);
          txApp.save(record);
        }
        offset += records.length;
      }
    });
  },
  (app) => {
    app.runInTransaction((txApp) => {
      const listings = txApp.findCollectionByNameOrId("workshop_listings");
      listings.viewQuery = listings.viewQuery.replace("s.widgetSchema, s.integrationKinds,", "s.widgetSchema,");
      txApp.save(listings);

      const submissions = txApp.findCollectionByNameOrId("submissions");
      submissions.fields.removeByName("integrationKinds");
      txApp.save(submissions);
    });
  },
);
