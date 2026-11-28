/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    app.save(
      new Collection({
        type: "view",
        name: "workshop_widget_catalog",
        listRule: "",
        viewRule: "",
        viewQuery: `
          SELECT listing.id, listing.title, listing.description, listing.score, listing.created,
            CAST((
              SELECT json_group_array(DISTINCT source.value ->> '$.integrationKind')
              FROM json_each(
                CASE WHEN json_valid(submission.content) THEN submission.content ELSE '{}' END,
                '$.sources'
              ) AS source
              WHERE source.type = 'object'
                AND source.value ->> '$.type' = 'integration'
                AND json_type(source.value, '$.integrationKind') = 'text'
            ) AS TEXT) AS integrationKinds
          FROM workshop_listings listing
          JOIN submissions submission ON submission.id = listing.id
          WHERE listing.type = 'customWidget'
            AND listing.widgetSchema = 'homarr-custom-widget-v2'
            AND listing.outdated = false
        `,
      }),
    );
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("workshop_widget_catalog"));
  },
);
