import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, createHmac } from "node:crypto";
import { test } from "node:test";

import { integrationSecretKindObject } from "@homarr/definitions/integration";

import {
  AuthorizationError,
  SecretCodecError,
  SecretExecutionError,
  createSecretCodec,
  planIntegrationSecretUpdates,
  projectIntegrationSecrets,
  withAuthorizedIntegrations,
} from "./index";
import type {
  BoardAccessEvidence,
  IntegrationExecutionEvidence,
  IntegrationExecutionOptions,
  PolicyIdentity,
  ResourceAuthorizationRepository,
  SecretCodec,
} from "./index";

const key = "ab".repeat(32);
const codec = createSecretCodec(key);
const anonymous: PolicyIdentity = { type: "anonymous" };
const member: PolicyIdentity = { type: "authenticated", userId: "member", groupIds: ["members"], permissions: [] };
const full: PolicyIdentity = { ...member, permissions: ["integration-full-all"] };
const publicBoard: BoardAccessEvidence = {
  id: "public-board",
  creatorId: "owner",
  isPublic: true,
  userPermissions: [],
  groupPermissions: [],
};
const resource: IntegrationExecutionEvidence = {
  id: "integration",
  name: "Disposable integration",
  kind: "piHole",
  url: "https://fixture.invalid/api",
  externalUrl: null,
  items: [{ item: { boardId: publicBoard.id } }],
  userPermissions: [{ userId: "foreign", permission: "full" }],
  groupPermissions: [{ groupId: "foreign", permission: "full" }],
  secrets: [
    { kind: "apiKey", value: codec.encryptSecret("disposable-private-api-key"), updatedAt: new Date(0) },
    { kind: "username", value: codec.encryptSecret("disposable-user"), updatedAt: new Date(0) },
  ],
};

function repository(
  resources: readonly IntegrationExecutionEvidence[] = [resource],
  boards: readonly BoardAccessEvidence[] = [publicBoard],
): ResourceAuthorizationRepository<IntegrationExecutionEvidence> {
  return {
    findBoard: async (_identity, id) => boards.find((board) => board.id === id) ?? null,
    findBoards: async (_identity, ids) => boards.filter(({ id }) => ids.includes(id)),
    findIntegrations: async (_identity, ids, kinds) =>
      resources.filter(({ id, kind }) => ids.includes(id) && kinds.includes(kind)),
  };
}

function options(identity: PolicyIdentity = anonymous): IntegrationExecutionOptions {
  return {
    identity,
    mode: { demoMode: false, demoReadOnly: false },
    action: "query",
    operation: "query",
    selection: { cardinality: "one", integrationId: resource.id },
    allowedKinds: ["piHole"],
  };
}

test("CBC bytes and keyed fingerprints match the existing source format without environment defaults", () => {
  const iv = Buffer.alloc(16, 3);
  const cipher = createCipheriv("aes-256-cbc", Buffer.from(key, "hex"), iv);
  const bytes = Buffer.concat([cipher.update("legacy-π-value"), cipher.final()]);
  assert.equal(codec.decryptSecret(`${bytes.toString("hex")}.${iv.toString("hex")}`), "legacy-π-value");
  const encrypted = codec.encryptSecret("new-π-value");
  const [data, initializationVector] = encrypted.split(".");
  assert.ok(data && initializationVector);
  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(key, "hex"), Buffer.from(initializationVector, "hex"));
  assert.equal(Buffer.concat([decipher.update(Buffer.from(data, "hex")), decipher.final()]).toString(), "new-π-value");
  const fingerprintKey = createHmac("sha256", Buffer.from(key, "hex")).update("homarr-keyed-fingerprint-v1").digest();
  const expected = createHmac("sha256", fingerprintKey).update("identity").digest("hex");
  assert.equal(codec.createKeyedFingerprint("identity"), expected);
  assert.equal(codec.verifyKeyedFingerprint("identity", expected), true);
  assert.equal(codec.verifyKeyedFingerprint("different", expected), false);
  assert.equal(codec.verifyKeyedFingerprint("identity", "malformed"), false);
  for (const invalid of ["", "0".repeat(64), "z".repeat(64), "ab"])
    assert.throws(() => createSecretCodec(invalid), SecretCodecError);
  assert.throws(() => codec.decryptSecret("invalid.invalid"), SecretCodecError);
});

test("foreign grants and partially authorized bulk selections fail before any decryption or execution", async () => {
  let decryptions = 0;
  let executions = 0;
  const countingCodec: SecretCodec = {
    ...codec,
    decryptSecret: (value) => {
      decryptions++;
      return codec.decryptSecret(value);
    },
  };
  const execute = async () => {
    executions++;
    return { ok: true };
  };
  await assert.rejects(
    withAuthorizedIntegrations(repository([resource], []), countingCodec, options(member), execute, (result) => result),
    (error: unknown) => error instanceof AuthorizationError && error.reason === "forbidden",
  );
  const second = { ...resource, id: "second", items: [] };
  await assert.rejects(
    withAuthorizedIntegrations(
      repository([resource, second]),
      countingCodec,
      {
        ...options(member),
        selection: { cardinality: "many", integrationIds: [resource.id, second.id] },
      },
      execute,
      (result) => result,
    ),
    (error: unknown) => error instanceof AuthorizationError && error.reason === "forbidden",
  );
  await assert.rejects(
    withAuthorizedIntegrations(
      repository(),
      countingCodec,
      { ...options(), allowedKinds: ["homeAssistant"] },
      execute,
      (result) => result,
    ),
    (error: unknown) => error instanceof AuthorizationError && error.reason === "not-found",
  );
  assert.equal(decryptions, 0);
  assert.equal(executions, 0);
});

test("public query executes only saved same-snapshot connections and redacts projected secret echoes", async () => {
  let executions = 0;
  const result = await withAuthorizedIntegrations(
    repository(),
    codec,
    options(),
    async (integrations) => {
      executions++;
      const integration = integrations[0];
      assert.ok(integration);
      assert.equal(integration.url, resource.url);
      assert.equal("userPermissions" in integration, false);
      assert.equal("secrets" in integration, false);
      const apiKey = integration.decryptedSecrets.find(({ kind }) => kind === "apiKey")?.value;
      assert.ok(apiKey);
      return { ok: true, echo: apiKey, encoded: Buffer.from(apiKey).toString("base64"), [apiKey]: "value" };
    },
    (value) => value,
  );
  assert.equal(executions, 1);
  assert.deepEqual(result, { ok: true, echo: "[REDACTED]", encoded: "[REDACTED]", "[REDACTED]": "value" });
});

test("arbitrary requests require full authority and demo restrictions before decryption", async () => {
  let executions = 0;
  const execute = async () => {
    executions++;
    return { ok: true };
  };
  const arbitrary: IntegrationExecutionOptions = { ...options(member), action: "full", operation: "mutation" };
  await assert.rejects(
    withAuthorizedIntegrations(repository(), codec, arbitrary, execute, (value) => value),
    (error: unknown) => error instanceof AuthorizationError && error.reason === "not-found",
  );
  await assert.rejects(
    withAuthorizedIntegrations(
      repository(),
      codec,
      { ...arbitrary, identity: full, mode: { demoMode: true, demoReadOnly: true } },
      execute,
      (value) => value,
    ),
    (error: unknown) => error instanceof AuthorizationError && error.reason === "demo-read-only",
  );
  assert.equal(executions, 0);
});

test("full detail projection decrypts only explicitly public source-defined secret fields", async () => {
  let decryptions = 0;
  const countingCodec: SecretCodec = {
    ...codec,
    decryptSecret: (value) => {
      decryptions++;
      return codec.decryptSecret(value);
    },
  };
  await assert.rejects(
    projectIntegrationSecrets(repository(), countingCodec, integrationSecretKindObject, member, resource.id, [
      "piHole",
    ]),
    AuthorizationError,
  );
  assert.equal(decryptions, 0);
  const result = await projectIntegrationSecrets(
    repository(),
    countingCodec,
    integrationSecretKindObject,
    full,
    resource.id,
    ["piHole"],
  );
  assert.deepEqual(result, [
    { kind: "apiKey", value: null, updatedAt: new Date(0) },
    { kind: "username", value: "disposable-user", updatedAt: new Date(0) },
  ]);
  assert.equal(decryptions, 1);
});

test("private null retains exact encrypted bytes, omitted fields clear and new strings replace", () => {
  const result = planIntegrationSecretUpdates(codec, resource.secrets, [
    { kind: "apiKey", value: null },
    { kind: "password", value: "replacement" },
  ]);
  assert.deepEqual(result[0], { type: "retain", kind: "apiKey", value: resource.secrets[0]?.value });
  const replacement = result[1];
  assert.ok(replacement && replacement.type === "replace");
  assert.equal(codec.decryptSecret(replacement.value), "replacement");
  assert.deepEqual(result[2], { type: "clear", kind: "username" });
});

test("provider and codec failures never carry secret-bearing causes into public errors", async () => {
  await assert.rejects(
    withAuthorizedIntegrations(
      repository(),
      codec,
      options(),
      async () => {
        throw new Error("disposable-private-api-key");
      },
      () => null,
    ),
    (error: unknown) => {
      assert.ok(error instanceof SecretExecutionError);
      assert.equal(error.message.includes("disposable-private-api-key"), false);
      assert.equal(error.cause, undefined);
      return true;
    },
  );
});
