/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const quotas = app.findCollectionByNameOrId("assistant_quotas");
    quotas.removeIndex("idx_assistant_quotas_user");
    quotas.addIndex("idx_assistant_quotas_user_day", true, "user, day", "");
    app.save(quotas);
  },
  (app) => {
    const quotas = app.findCollectionByNameOrId("assistant_quotas");
    quotas.removeIndex("idx_assistant_quotas_user_day");

    // The previous schema can keep only one record per user. Retain the latest UTC day when rolling back.
    app
      .db()
      .newQuery(`
        DELETE FROM assistant_quotas
        WHERE id NOT IN (
          SELECT (
            SELECT candidate.id
            FROM assistant_quotas candidate
            WHERE candidate.user = quota_user.user
            ORDER BY candidate.day DESC, candidate.created DESC, candidate.id DESC
            LIMIT 1
          )
          FROM assistant_quotas quota_user
          GROUP BY quota_user.user
        )
      `)
      .execute();

    quotas.addIndex("idx_assistant_quotas_user", true, "user", "");
    app.save(quotas);
  },
);
