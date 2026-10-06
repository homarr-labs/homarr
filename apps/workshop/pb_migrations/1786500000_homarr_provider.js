/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const quotas = new Collection({
      type: "base",
      name: "assistant_quotas",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          type: "relation",
          name: "user",
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true,
        },
        { type: "text", name: "day", required: true, min: 10, max: 10 },
        { type: "number", name: "used", onlyInt: true, min: 0 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
    });
    quotas.addIndex("idx_assistant_quotas_user", true, "user", "");
    app.save(quotas);

    const globalQuota = new Collection({
      type: "base",
      name: "assistant_global_quota",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { type: "text", name: "key", required: true, min: 1, max: 32 },
        { type: "text", name: "day", required: true, min: 10, max: 10 },
        { type: "number", name: "used", onlyInt: true, min: 0 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
    });
    globalQuota.addIndex("idx_assistant_global_quota_key", true, "key", "");
    app.save(globalQuota);

    const globalRecord = new Record(globalQuota);
    globalRecord.set("key", "default");
    globalRecord.set("day", "1970-01-01");
    globalRecord.set("used", 0);
    app.save(globalRecord);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("assistant_global_quota"));
    app.delete(app.findCollectionByNameOrId("assistant_quotas"));
  },
);
