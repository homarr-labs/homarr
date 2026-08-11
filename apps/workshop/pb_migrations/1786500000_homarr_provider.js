/// <reference path="../pb_data/types.d.ts" />

const requestFields = () => [
  { type: "select", name: "status", required: true, maxSelect: 1, values: ["processing", "completed", "failed"] },
  { type: "text", name: "model", required: true, min: 1, max: 128 },
  { type: "number", name: "requestUnits", required: true, onlyInt: true, min: 1, max: 1000 },
  { type: "number", name: "inputTokens", onlyInt: true, min: 0 },
  { type: "number", name: "outputTokens", onlyInt: true, min: 0 },
  { type: "number", name: "totalTokens", onlyInt: true, min: 0 },
  { type: "number", name: "durationMs", onlyInt: true, min: 0 },
  { type: "number", name: "cost", min: 0 },
  { type: "autodate", name: "created", onCreate: true },
  { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
];

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const activity = new Collection({
      type: "base",
      name: "assistant_activity",
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: requestFields(),
    });
    activity.addIndex("idx_assistant_activity_created", false, "created", "");
    app.save(activity);

    const requests = new Collection({
      type: "base",
      name: "assistant_requests",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        ...requestFields(),
        {
          type: "relation",
          name: "user",
          required: true,
          maxSelect: 1,
          collectionId: users.id,
          cascadeDelete: true,
        },
        {
          type: "relation",
          name: "publicActivity",
          required: true,
          maxSelect: 1,
          collectionId: activity.id,
          cascadeDelete: true,
        },
      ],
    });
    requests.addIndex("idx_assistant_requests_user_created", false, "user, created", "");
    app.save(requests);

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
        { type: "number", name: "dailyLimit", required: true, onlyInt: true, min: 0, max: 100000 },
        { type: "text", name: "day", required: true, min: 10, max: 10 },
        { type: "number", name: "used", onlyInt: true, min: 0 },
        { type: "number", name: "inputTokens", onlyInt: true, min: 0 },
        { type: "number", name: "outputTokens", onlyInt: true, min: 0 },
        { type: "number", name: "totalTokens", onlyInt: true, min: 0 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ],
    });
    quotas.addIndex("idx_assistant_quotas_user", true, "user", "");
    app.save(quotas);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("assistant_quotas"));
    app.delete(app.findCollectionByNameOrId("assistant_requests"));
    app.delete(app.findCollectionByNameOrId("assistant_activity"));
  },
);
