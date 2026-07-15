/// <reference path="../pb_data/types.d.ts" />

// --- Submissions ---

onRecordCreateRequest((e) => {
  e.record.set("author", e.auth?.id);
  e.record.set("upvotes", 0);
  e.record.set("downvotes", 0);
  e.record.set("version", 1);
  e.next();
}, "submissions");

onRecordAfterCreateSuccess((e) => {
  try {
    var votes = e.app.findCollectionByNameOrId("votes");
    var vote = new Record(votes);
    vote.set("submission", e.record.id);
    vote.set("user", e.record.get("author"));
    vote.set("value", 1);
    e.app.save(vote);
  } catch (err) {
    console.log("auto-upvote failed for submission " + e.record.id + ": " + err);
  }
  e.next();
}, "submissions");

onRecordUpdateRequest((e) => {
  var original = e.app.findRecordById("submissions", e.record.id);
  e.record.set("author", original.get("author"));
  e.record.set("upvotes", original.get("upvotes"));
  e.record.set("downvotes", original.get("downvotes"));
  e.record.set("type", original.get("type"));
  e.record.set("schemaVersion", original.get("schemaVersion"));
  e.record.set("version", original.get("version"));
  e.next();
}, "submissions");

// --- Votes ---

onRecordCreateRequest((e) => {
  var v = +e.record.get("value");
  if (v !== 1 && v !== -1) throw new BadRequestError("value must be 1 or -1");
  e.record.set("user", e.auth?.id);
  e.next();
}, "votes");

onRecordUpdateRequest((e) => {
  var v = +e.record.get("value");
  if (v !== 1 && v !== -1) throw new BadRequestError("value must be 1 or -1");
  var original = e.app.findRecordById("votes", e.record.id);
  e.record.set("user", original.get("user"));
  e.record.set("submission", original.get("submission"));
  e.next();
}, "votes");

// Vote count hooks removed — the `marketplace` view computes upvotes/downvotes via SQL

// --- Reports & Comments ---

onRecordCreateRequest((e) => {
  e.record.set("user", e.auth?.id);
  e.next();
}, "reports");

onRecordCreateRequest((e) => {
  e.record.set("author", e.auth?.id);
  e.next();
}, "comments");

onRecordUpdateRequest((e) => {
  var original = e.app.findRecordById("comments", e.record.id);
  e.record.set("author", original.get("author"));
  e.record.set("submission", original.get("submission"));
  e.next();
}, "comments");
