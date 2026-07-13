import assert from "node:assert/strict";

import PocketBase, { ClientResponseError } from "pocketbase";

const baseUrl = process.env.WORKSHOP_TEST_URL;
const superuserEmail = process.env.WORKSHOP_TEST_SUPERUSER_EMAIL;
const superuserPassword = process.env.WORKSHOP_TEST_SUPERUSER_PASSWORD;
assert(baseUrl && superuserEmail && superuserPassword, "Workshop integration test environment is incomplete");

const root = new PocketBase(baseUrl);
await root.collection("_superusers").authWithPassword(superuserEmail, superuserPassword);

const createUser = async (name, role = "member", state = "active") => {
  const password = `Workshop${name}Password123!`;
  return root.collection("users").create({
    email: `${name.toLowerCase()}@homarr.test`,
    password,
    passwordConfirm: password,
    verified: true,
    displayName: name,
    role,
    state,
  });
};

const expectStatus = async (operation, status) => {
  const statuses = Array.isArray(status) ? status : [status];
  await assert.rejects(operation, (error) => error instanceof ClientResponseError && statuses.includes(error.status));
};

const memberRecord = await createUser("Member");
const secondMemberRecord = await createUser("SecondMember");
const bannedRecord = await createUser("Banned", "member", "posting_banned");
const disabledRecord = await createUser("Disabled");
const moderatorRecord = await createUser("Moderator", "moderator");
const adminRecord = await createUser("Admin", "admin");

const member = await root.collection("users").impersonate(memberRecord.id, 3600);
const secondMember = await root.collection("users").impersonate(secondMemberRecord.id, 3600);
const banned = await root.collection("users").impersonate(bannedRecord.id, 3600);
const disabled = await root.collection("users").impersonate(disabledRecord.id, 3600);
const moderator = await root.collection("users").impersonate(moderatorRecord.id, 3600);
const admin = await root.collection("users").impersonate(adminRecord.id, 3600);

const forgedMember = await member.collection("users").update(memberRecord.id, {
  role: "admin",
  state: "posting_banned",
  moderationReason: "self escalation",
});
assert.equal(forgedMember.role, "member", "members must not change their own role");
assert.equal(forgedMember.state, "active", "members must not change their own account state");
assert.equal(forgedMember.moderationReason, "", "members must not change protected moderation fields");

await admin.send(`/api/workshop/moderation/users/${disabledRecord.id}/state`, {
  method: "POST",
  body: { state: "disabled", reason: "Integration disable" },
});

const submission = await member.collection("submissions").create({
  type: "css",
  title: "Integration theme",
  description: "A backend integration fixture",
  schemaVersion: "forged-version",
  content: ":root { --homarr-test: #fff; }",
  author: secondMemberRecord.id,
  authorName: "Forged",
  revision: 99,
});
assert.equal(submission.author, memberRecord.id, "server must enforce ownership");
assert.equal(submission.authorName, "Member", "server must snapshot the authenticated author name");
assert.equal(submission.revision, 1, "server must own the initial revision");
assert.equal(submission.schemaVersion, "homarr-custom-css-v1", "server must own schemaVersion");

await expectStatus(
  () => banned.collection("submissions").create({ type: "css", title: "Blocked theme", content: "body {}" }),
  403,
);
await expectStatus(() => disabled.collection("votes").create({ submission: submission.id, value: 1 }), [400, 403]);
await expectStatus(
  () =>
    member.collection("submissions").create({
      type: "widget",
      title: "Invalid widget",
      content: JSON.stringify({ $schema: "homarr-custom-widget-v2", name: "Missing contract" }),
    }),
  400,
);

const vote = await member.collection("votes").create({ submission: submission.id, value: 1 });
await expectStatus(() => member.collection("votes").create({ submission: submission.id, value: -1 }), 400);
assert.equal(
  (await member.collection("votes").update(vote.id, { submission: "forged", user: "forged", value: -1 })).submission,
  submission.id,
);

const report = await secondMember.collection("reports").create({
  submission: submission.id,
  reporter: memberRecord.id,
  category: "spam",
  explanation: "Integration report",
  status: "dismissed",
});
assert.equal(report.reporter, secondMemberRecord.id);
assert.equal(report.status, "open");
assert.equal((await member.collection("reports").getList()).totalItems, 0, "reports must remain private from members");
assert.equal((await moderator.collection("reports").getList()).items.length, 1);

await expectStatus(
  () =>
    member.send(`/api/workshop/moderation/users/${secondMemberRecord.id}/state`, {
      method: "POST",
      body: { state: "posting_banned", reason: "No permission" },
    }),
  403,
);
await expectStatus(
  () =>
    moderator.send(`/api/workshop/moderation/users/${adminRecord.id}/state`, {
      method: "POST",
      body: { state: "disabled", reason: "Cannot alter admin" },
    }),
  403,
);
await expectStatus(
  () =>
    moderator.send(`/api/workshop/moderation/users/${secondMemberRecord.id}/role`, {
      method: "POST",
      body: { role: "moderator", reason: "Cannot promote" },
    }),
  403,
);

await admin.send(`/api/workshop/moderation/users/${secondMemberRecord.id}/role`, {
  method: "POST",
  body: { role: "moderator", reason: "Integration promotion" },
});
assert.equal((await root.collection("users").getOne(secondMemberRecord.id)).role, "moderator");

await moderator.send(`/api/workshop/moderation/reports/${report.id}/resolve`, {
  method: "POST",
  body: { status: "resolved", reason: "Integration resolution" },
});
assert.equal((await root.collection("reports").getOne(report.id)).status, "resolved");

await moderator.send(`/api/workshop/moderation/submissions/${submission.id}/remove`, {
  method: "POST",
  body: { reason: "Integration removal" },
});
await expectStatus(() => root.collection("submissions").getOne(submission.id), 404);
await expectStatus(() => root.collection("votes").getOne(vote.id), 404);
await expectStatus(() => root.collection("reports").getOne(report.id), 404);

const actions = await root.collection("moderation_actions").getFullList({ sort: "created" });
assert.deepEqual(
  actions.map((action) => action.action),
  ["set_account_state", "set_role", "resolve_report", "remove_submission"],
);
assert(actions.at(-1)?.snapshot.includes("Integration theme"), "removal audit must retain a target snapshot");

const anonymous = new PocketBase(baseUrl);
const listings = await anonymous.collection("workshop_listings").getList();
assert.equal(listings.totalItems, 0);
await expectStatus(() => anonymous.collection("submissions").getList(), 403);

console.log("Workshop backend integration matrix passed");
