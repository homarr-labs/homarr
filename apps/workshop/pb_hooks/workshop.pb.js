/// <reference path="../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
  const utils = require(`${__hooks}/workshop-utils.js`);
  if (!e.auth) throw new UnauthorizedError("Authentication is required");
  utils.validateSubmission(e.record);
  const user = e.app.findRecordById("users", e.auth.id);
  e.record.set("author", e.auth.id);
  e.record.set("authorName", user.getString("displayName"));
  e.record.set("revision", 1);
  e.next();
}, "submissions");

onRecordUpdateRequest((e) => {
  const utils = require(`${__hooks}/workshop-utils.js`);
  const original = e.app.findRecordById("submissions", e.record.id);
  e.record.set("author", original.get("author"));
  e.record.set("authorName", original.get("authorName"));
  e.record.set("revision", original.getInt("revision") + 1);
  utils.validateSubmission(e.record);
  e.next();
}, "submissions");

onRecordDeleteRequest((e) => {
  const utils = require(`${__hooks}/workshop-utils.js`);
  const adminDelete = e.auth && utils.isAdmin(e.app, e.auth.id) && e.record.getString("author") !== e.auth.id;
  const snapshot = adminDelete ? utils.snapshot(e.record) : "";
  e.next();
  if (adminDelete)
    utils.audit(e.app, e.auth, "delete_submission", {
      submissionId: e.record.id,
      reason: "Deleted by Workshop administrator",
      snapshot,
    });
}, "submissions");

onRecordCreateRequest((e) => {
  if (!e.auth) throw new UnauthorizedError("Authentication is required");
  const value = e.record.getInt("value");
  if (value !== 1 && value !== -1) throw new BadRequestError("Vote must be 1 or -1");
  e.record.set("user", e.auth.id);
  e.next();
}, "votes");

onRecordUpdateRequest((e) => {
  const original = e.app.findRecordById("votes", e.record.id);
  const value = e.record.getInt("value");
  if (value !== 1 && value !== -1) throw new BadRequestError("Vote must be 1 or -1");
  e.record.set("user", original.get("user"));
  e.record.set("submission", original.get("submission"));
  e.next();
}, "votes");

onRecordCreateRequest((e) => {
  if (!e.auth) throw new UnauthorizedError("Authentication is required");
  e.record.set("reporter", e.auth.id);
  e.record.set("status", "open");
  e.next();
}, "reports");

onRecordUpdateRequest((e) => {
  const utils = require(`${__hooks}/workshop-utils.js`);
  const original = e.app.findRecordById("reports", e.record.id);
  if (e.record.getString("status") !== "dismissed") throw new BadRequestError("Reports can only be dismissed");
  e.record.set("submission", original.get("submission"));
  e.record.set("reporter", original.get("reporter"));
  e.record.set("category", original.get("category"));
  e.record.set("explanation", original.get("explanation"));
  e.next();
  if (original.getString("status") !== "dismissed") {
    utils.audit(e.app, e.auth, "dismiss_report", {
      submissionId: original.getString("submission"),
      reportId: original.id,
      reason: e.record.getString("dismissalReason") || "Dismissed by Workshop administrator",
      snapshot: utils.snapshot(original),
    });
  }
}, "reports");
