import assert from "node:assert/strict";
import { test } from "node:test";

import { hashPasswordAsync } from "../../security";
import { verifyBasicCredentialsAsync } from "./basic-authorization";
import type { CredentialsIdentity } from "./contracts";

test("local login keeps lowercase-only provider-scoped lookup and existing bcrypt verification", async () => {
  const password = "disposable-password";
  const passwordHash = await hashPasswordAsync(password);
  const identities: (CredentialsIdentity & { provider: string })[] = [
    { id: "directory-alice", name: "alice", password: passwordHash, provider: "ldap" },
    { id: "local-alice", name: "alice", password: passwordHash, provider: "credentials" },
    { id: "passwordless", name: "passwordless", password: null, provider: "credentials" },
  ];
  const selectors: { name: string; provider: "credentials" }[] = [];
  const resources = {
    repository: {
      async findUserByName(selector: { name: string; provider: "credentials" }) {
        selectors.push(selector);
        return (
          identities.find((identity) => identity.name === selector.name && identity.provider === selector.provider) ??
          null
        );
      },
    },
    logger: { info() {}, warn() {}, error() {} },
  };
  assert.deepEqual(await verifyBasicCredentialsAsync(resources, { name: "ALICE", password }), {
    id: "local-alice",
    name: "alice",
  });
  assert.equal(await verifyBasicCredentialsAsync(resources, { name: "alice", password: "wrong" }), null);
  assert.equal(await verifyBasicCredentialsAsync(resources, { name: " alice ", password }), null);
  assert.deepEqual(selectors, [
    { name: "alice", provider: "credentials" },
    { name: "alice", provider: "credentials" },
    { name: " alice ", provider: "credentials" },
  ]);
  await assert.rejects(() => verifyBasicCredentialsAsync(resources, { name: "", password }));
  assert.equal(selectors.length, 3);
  assert.equal(await verifyBasicCredentialsAsync(resources, { name: "missing", password }), null);
  assert.equal(await verifyBasicCredentialsAsync(resources, { name: "passwordless", password }), null);
});
