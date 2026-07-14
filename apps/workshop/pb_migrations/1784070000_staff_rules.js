/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const state = users.fields.getByName("state");
    if (state) state.values = ["active", "disabled"];

    let staff;
    try {
      staff = app.findCollectionByNameOrId("workshop_staff");
    } catch {
      staff = new Collection({
        type: "base",
        name: "workshop_staff",
        listRule: "user = @request.auth.id",
        viewRule: "user = @request.auth.id",
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
          { type: "select", name: "role", required: true, maxSelect: 1, values: ["moderator", "admin"] },
          { type: "autodate", name: "created", onCreate: true },
          { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
        ],
      });
      staff.addIndex("idx_workshop_staff_user", true, "user", "");
      app.save(staff);
    }

    for (const user of app.findRecordsByFilter("users", "role = 'moderator' || role = 'admin'", "", 0, 0)) {
      if (!user) continue;
      let record;
      try {
        record = app.findFirstRecordByFilter("workshop_staff", "user = {:user}", { user: user.id });
      } catch {
        record = new Record(staff);
        record.set("user", user.id);
      }
      record.set("role", user.getString("role"));
      app.save(record);
    }

    const staffRule = "@collection.workshop_staff.user ?= @request.auth.id";
    users.listRule = staffRule;
    users.viewRule = `id = @request.auth.id || ${staffRule}`;
    users.updateRule =
      "id = @request.auth.id && @request.auth.state != 'disabled' && @request.body.role:changed = false && @request.body.state:changed = false && @request.body.moderationReason:changed = false";
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.listRule = "@request.auth.role = 'moderator' || @request.auth.role = 'admin'";
    users.viewRule = "id = @request.auth.id || @request.auth.role = 'moderator' || @request.auth.role = 'admin'";
    users.updateRule = "id = @request.auth.id && @request.auth.state != 'disabled'";
    const state = users.fields.getByName("state");
    if (state) state.values = ["active", "posting_banned", "disabled"];
    app.save(users);
    try {
      app.delete(app.findCollectionByNameOrId("workshop_staff"));
    } catch {
      // Already removed.
    }
  },
);
