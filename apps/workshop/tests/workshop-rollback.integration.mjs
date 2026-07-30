import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const baseUrl = process.env.WORKSHOP_TEST_URL;
const snapshotPath = process.env.WORKSHOP_ROLLBACK_SNAPSHOT;
const phase = process.argv[2];
if (!baseUrl) throw new Error("WORKSHOP_TEST_URL is required");
if (!snapshotPath) throw new Error("WORKSHOP_ROLLBACK_SNAPSHOT is required");
if (!["fresh-prepare", "fresh-migrated", "fresh-restored", "prepare", "migrated", "restored"].includes(phase)) {
  throw new Error("Unknown Workshop rollback test phase");
}

const superuser = {
  email: "workshop-rollback@example.invalid",
  password: "WorkshopRollback123!",
};
const baselineUser = {
  email: "rollback-user@example.invalid",
  password: "WorkshopRollbackUser123!",
  note: "retained across the Workshop migration chain",
};
const workshopCollections = [
  "workshop_migration_state",
  "submissions",
  "votes",
  "comments",
  "reports",
  "workshop_listings",
];
const workshopUserFields = ["displayName", "avatarUrl", "avatar", "githubUsername", "githubProfileUrl", "isAdmin"];

const request = async (path, init = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  return body;
};

const auth = await request("/api/collections/_superusers/auth-with-password", {
  method: "POST",
  body: JSON.stringify({ identity: superuser.email, password: superuser.password }),
});
const rootHeaders = { authorization: `Bearer ${auth.token}` };

const collectionList = async () => {
  const result = await request("/api/collections?perPage=200", { headers: rootHeaders });
  return new Map(result.items.map((collection) => [collection.name, collection]));
};
const collection = (name) => request(`/api/collections/${name}`, { headers: rootHeaders });
const records = (name) =>
  request(`/api/collections/${name}/records?perPage=200`, {
    headers: rootHeaders,
  });
const normalized = (value) => JSON.parse(JSON.stringify(value));
const publicOauthConfig = (oauth2) => {
  const value = normalized(oauth2);
  value.providers = value.providers?.map(({ clientSecret: _clientSecret, ...provider }) => provider);
  return value;
};
const userConfig = (users) => ({
  rules: {
    listRule: users.listRule,
    viewRule: users.viewRule,
    createRule: users.createRule,
    updateRule: users.updateRule,
    deleteRule: users.deleteRule,
  },
  passwordAuth: normalized(users.passwordAuth),
  oauth2: publicOauthConfig(users.oauth2),
  fieldNames: users.fields.map((field) => field.name).toSorted(),
});
const readSnapshot = async () => JSON.parse(await readFile(snapshotPath, "utf8"));

const assertBaselineData = async () => {
  const userRecords = await records("users");
  const retainedUser = userRecords.items.find((record) => record.email === baselineUser.email);
  assert.equal(retainedUser?.baselineNote, baselineUser.note, "Baseline user data was not retained");

  const sentinelRecords = await records("rollback_sentinel");
  assert.equal(sentinelRecords.items.length, 1, "Unrelated baseline record count changed");
  assert.equal(sentinelRecords.items[0]?.value, "keep-me", "Unrelated baseline data changed");
};

const assertMigrated = async () => {
  const before = await readSnapshot();
  const collections = await collectionList();
  for (const name of [...workshopCollections, "users", "rollback_sentinel"]) {
    assert.ok(collections.has(name), `Migrated database is missing collection ${name}`);
  }

  const users = await collection("users");
  assert.equal(users.passwordAuth?.enabled, false, "Workshop migration must disable password authentication");
  assert.deepEqual(
    publicOauthConfig(users.oauth2),
    before.users.oauth2,
    "Workshop migration changed existing OAuth settings",
  );
  for (const name of workshopUserFields) {
    assert.ok(
      users.fields.some((field) => field.name === name),
      `Workshop user field ${name} is missing`,
    );
  }
  assert.match(
    users.updateRule ?? "",
    /githubProfileUrl:changed = false/u,
    "OAuth identity update rule is not hardened",
  );

  const stateRecords = await records("workshop_migration_state");
  assert.equal(stateRecords.items.length, 1, "Workshop migration state snapshot is missing");
  const migrationState = JSON.parse(stateRecords.items[0].snapshot);
  assert.equal(migrationState.usersExisted, true, "Workshop migration did not recognize the existing users collection");
  assert.deepEqual(migrationState.users.passwordAuth, before.users.passwordAuth);
  assert.deepEqual(publicOauthConfig(migrationState.users.oauth2), before.users.oauth2);
  assert.deepEqual(
    {
      listRule: migrationState.users.listRule,
      viewRule: migrationState.users.viewRule,
      createRule: migrationState.users.createRule,
      updateRule: migrationState.users.updateRule,
      deleteRule: migrationState.users.deleteRule,
    },
    before.users.rules,
    "Workshop migration state did not snapshot the original user rules",
  );
  assert.equal(
    migrationState.users.oauth2.providers.find((provider) => provider.name === "github")?.clientSecret,
    "rollback-baseline-secret",
    "Workshop migration state did not retain the OAuth secret required for rollback",
  );
  await assertBaselineData();
};

if (phase === "fresh-prepare") {
  let collections = await collectionList();
  if (collections.has("users")) {
    await request("/api/collections/users", { method: "DELETE", headers: rootHeaders });
    collections = await collectionList();
  }
  for (const name of [...workshopCollections, "users", "rollback_sentinel"]) {
    assert.ok(!collections.has(name), `Fresh database unexpectedly contains collection ${name}`);
  }
  await writeFile(snapshotPath, "{}", { mode: 0o600 });
  console.log("Workshop fresh rollback baseline captured");
} else if (phase === "fresh-migrated") {
  const collections = await collectionList();
  for (const name of [...workshopCollections, "users"]) {
    assert.ok(collections.has(name), `Fresh migration is missing collection ${name}`);
  }
  const users = await collection("users");
  for (const name of workshopUserFields) {
    assert.ok(
      users.fields.some((field) => field.name === name),
      `Fresh migration is missing user field ${name}`,
    );
  }
  const stateRecords = await records("workshop_migration_state");
  assert.equal(stateRecords.items.length, 1, "Fresh migration state snapshot is missing");
  const migrationState = JSON.parse(stateRecords.items[0].snapshot);
  assert.equal(migrationState.usersExisted, false, "Fresh migration incorrectly recorded an existing users collection");
  assert.equal(migrationState.users, null, "Fresh migration retained nonexistent user settings");
  console.log("Workshop fresh migration chain verified");
} else if (phase === "fresh-restored") {
  const collections = await collectionList();
  for (const name of [...workshopCollections, "users", "rollback_sentinel"]) {
    assert.ok(!collections.has(name), `Fresh rollback left collection ${name}`);
  }
  assert.ok(collections.has("_superusers"), "Fresh rollback removed PocketBase superuser data");
  console.log("Workshop fresh rollback state verified");
} else if (phase === "prepare") {
  const collections = await collectionList();
  for (const name of [...workshopCollections, "users", "rollback_sentinel"]) {
    assert.ok(!collections.has(name), `Fresh rollback fixture unexpectedly contains collection ${name}`);
  }

  await request("/api/collections", {
    method: "POST",
    headers: rootHeaders,
    body: JSON.stringify({
      type: "auth",
      name: "users",
      listRule: "@request.auth.id != ''",
      viewRule: "id = @request.auth.id",
      createRule: "@request.body.email != ''",
      updateRule: "id = @request.auth.id",
      deleteRule: "id = @request.auth.id",
      passwordAuth: { enabled: true, identityFields: ["email"] },
      oauth2: {
        enabled: true,
        providers: [
          {
            name: "github",
            clientId: "rollback-baseline-client",
            clientSecret: "rollback-baseline-secret",
          },
        ],
      },
      fields: [{ type: "text", name: "baselineNote", max: 200 }],
    }),
  });
  await request("/api/collections", {
    method: "POST",
    headers: rootHeaders,
    body: JSON.stringify({
      type: "base",
      name: "rollback_sentinel",
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [{ type: "text", name: "value", required: true, max: 100 }],
    }),
  });
  await request("/api/collections/users/records", {
    method: "POST",
    headers: rootHeaders,
    body: JSON.stringify({
      email: baselineUser.email,
      emailVisibility: false,
      verified: true,
      password: baselineUser.password,
      passwordConfirm: baselineUser.password,
      baselineNote: baselineUser.note,
    }),
  });
  await request("/api/collections/rollback_sentinel/records", {
    method: "POST",
    headers: rootHeaders,
    body: JSON.stringify({ value: "keep-me" }),
  });

  const users = await collection("users");
  assert.equal(users.passwordAuth?.enabled, true);
  assert.equal(users.oauth2?.enabled, true);
  assert.ok(users.oauth2?.providers?.some((provider) => provider.name === "github"));
  await assertBaselineData();
  await writeFile(snapshotPath, JSON.stringify({ users: userConfig(users) }), { mode: 0o600 });
  console.log("Workshop rollback baseline prepared");
} else if (phase === "migrated") {
  await assertMigrated();
  console.log("Workshop full migration chain verified");
} else {
  const before = await readSnapshot();
  const collections = await collectionList();
  for (const name of workshopCollections) {
    assert.ok(!collections.has(name), `Rollback left Workshop collection ${name}`);
  }
  for (const name of ["users", "rollback_sentinel"]) {
    assert.ok(collections.has(name), `Rollback removed baseline collection ${name}`);
  }

  const users = await collection("users");
  assert.deepEqual(userConfig(users), before.users, "Rollback did not restore user rules, fields, password, or OAuth");
  await assertBaselineData();
  console.log("Workshop full rollback state verified");
}
