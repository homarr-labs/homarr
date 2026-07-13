/// <reference path="../pb_data/types.d.ts" />

onRecordAuthWithOAuth2Request((e) => {
  const utils = require(`${__hooks}/workshop-utils.js`);
  if (e.record && e.record.getString("state") === "disabled")
    utils.fail(ForbiddenError, "account_disabled", "Account is disabled");
  if (e.isNewRecord) {
    e.createData.displayName = e.oAuth2User.name || e.oAuth2User.username || "Community member";
    e.createData.avatarUrl = e.oAuth2User.avatarUrl || "";
    e.createData.role = "member";
    e.createData.state = "active";
  }
  e.next();
}, "users");

onRecordAuthRequest((e) => {
  const utils = require(`${__hooks}/workshop-utils.js`);
  if (e.record.getString("state") === "disabled") utils.fail(ForbiddenError, "account_disabled", "Account is disabled");
  e.next();
}, "users");

onRecordUpdateRequest((e) => {
  const original = e.app.findRecordById("users", e.record.id);
  e.record.set("role", original.get("role"));
  e.record.set("state", original.get("state"));
  e.record.set("moderationReason", original.get("moderationReason"));
  e.next();
}, "users");

onRecordCreateRequest((e) => {
  const utils = require(`${__hooks}/workshop-utils.js`);
  const account = utils.requireWritableAccount(e.app, e.auth, true);
  utils.validateSubmission(e.record);
  e.record.set("author", e.auth.id);
  e.record.set("authorName", account.getString("displayName"));
  e.record.set("revision", 1);
  e.next();
}, "submissions");

onRecordUpdateRequest((e) => {
  const utils = require(`${__hooks}/workshop-utils.js`);
  utils.requireWritableAccount(e.app, e.auth, true);
  const original = e.app.findRecordById("submissions", e.record.id);
  e.record.set("author", original.get("author"));
  e.record.set("authorName", original.get("authorName"));
  e.record.set("type", original.get("type"));
  e.record.set("schemaVersion", original.get("schemaVersion"));
  e.record.set(
    "revision",
    original.getInt("revision") + (e.record.getString("content") !== original.getString("content") ? 1 : 0),
  );
  utils.validateSubmission(e.record);
  e.next();
}, "submissions");

onRecordCreateRequest((e) => {
  const utils = require(`${__hooks}/workshop-utils.js`);
  utils.requireWritableAccount(e.app, e.auth, false);
  const value = e.record.getInt("value");
  if (value !== 1 && value !== -1) throw new BadRequestError("Vote must be 1 or -1");
  e.record.set("user", e.auth.id);
  e.next();
}, "votes");

onRecordUpdateRequest((e) => {
  const utils = require(`${__hooks}/workshop-utils.js`);
  utils.requireWritableAccount(e.app, e.auth, false);
  const original = e.app.findRecordById("votes", e.record.id);
  const value = e.record.getInt("value");
  if (value !== 1 && value !== -1) throw new BadRequestError("Vote must be 1 or -1");
  e.record.set("user", original.get("user"));
  e.record.set("submission", original.get("submission"));
  e.next();
}, "votes");

onRecordCreateRequest((e) => {
  const utils = require(`${__hooks}/workshop-utils.js`);
  utils.requireWritableAccount(e.app, e.auth, false);
  e.record.set("reporter", e.auth.id);
  e.record.set("status", "open");
  e.next();
}, "reports");

routerAdd(
  "POST",
  "/api/workshop/moderation/submissions/{id}/remove",
  (e) => {
    const utils = require(`${__hooks}/workshop-utils.js`);
    utils.requireStaff(e.app, e.auth);
    const data = utils.body(e);
    const id = e.request.pathValue("id");
    e.app.runInTransaction((tx) => {
      const target = tx.findRecordById("submissions", id);
      utils.audit(tx, e.auth, "remove_submission", "submission", id, data.reason, utils.snapshot(target));
      tx.delete(target);
    });
    return e.json(200, { success: true });
  },
  $apis.requireAuth("users"),
);

routerAdd(
  "POST",
  "/api/workshop/moderation/users/{id}/state",
  (e) => {
    const utils = require(`${__hooks}/workshop-utils.js`);
    const actorRole = utils.requireStaff(e.app, e.auth);
    const data = utils.body(e);
    if (!["active", "posting_banned", "disabled"].includes(data.state))
      throw new BadRequestError("Invalid account state");
    const id = e.request.pathValue("id");
    if (id === e.auth.id) throw new BadRequestError("You cannot moderate your own account");
    e.app.runInTransaction((tx) => {
      const target = tx.findRecordById("users", id);
      if (target.getString("role") === "admin" && actorRole !== "admin") throw new ForbiddenError("forbidden");
      const previous = utils.snapshot(target);
      target.set("state", data.state);
      target.set("moderationReason", data.reason);
      tx.save(target);
      utils.audit(tx, e.auth, "set_account_state", "user", id, data.reason, previous);
    });
    return e.json(200, { success: true });
  },
  $apis.requireAuth("users"),
);

routerAdd(
  "POST",
  "/api/workshop/moderation/users/{id}/role",
  (e) => {
    const utils = require(`${__hooks}/workshop-utils.js`);
    if (utils.requireStaff(e.app, e.auth) !== "admin") throw new ForbiddenError("forbidden");
    const data = utils.body(e);
    if (!["member", "moderator", "admin"].includes(data.role)) throw new BadRequestError("Invalid role");
    const id = e.request.pathValue("id");
    if (id === e.auth.id) throw new BadRequestError("You cannot change your own role");
    e.app.runInTransaction((tx) => {
      const target = tx.findRecordById("users", id);
      const previous = utils.snapshot(target);
      target.set("role", data.role);
      tx.save(target);
      utils.audit(tx, e.auth, "set_role", "user", id, data.reason, previous);
    });
    return e.json(200, { success: true });
  },
  $apis.requireAuth("users"),
);

routerAdd(
  "POST",
  "/api/workshop/moderation/reports/{id}/resolve",
  (e) => {
    const utils = require(`${__hooks}/workshop-utils.js`);
    utils.requireStaff(e.app, e.auth);
    const data = utils.body(e);
    if (!["resolved", "dismissed"].includes(data.status)) throw new BadRequestError("Invalid report status");
    const id = e.request.pathValue("id");
    e.app.runInTransaction((tx) => {
      const target = tx.findRecordById("reports", id);
      const previous = utils.snapshot(target);
      target.set("status", data.status);
      tx.save(target);
      utils.audit(tx, e.auth, "resolve_report", "report", id, data.reason, previous);
    });
    return e.json(200, { success: true });
  },
  $apis.requireAuth("users"),
);
