/// <reference path="../pb_data/types.d.ts" />

onRecordCreate((e) => {
  e.record.set("isAdmin", false);
  e.next();
}, "users");
