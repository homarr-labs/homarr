import assert from "node:assert/strict";
import path from "node:path";
import { call, ORPCError } from "@orpc/server";
import { asc, eq, inArray, like } from "drizzle-orm";

import { createSecretCodec } from "@homarr/auth/nitro/policy";
import type { Database } from "@homarr/db";
import { integrationDefs } from "@homarr/definitions";
import type { IntegrationConnectionResult } from "@homarr/integrations/runtime";

import * as tables from "../../../../db/schema/sqlite";
import { backendContractRevision } from "../context";
import type { BackendContext, BackendPrincipal } from "../context";
import { defineBackendContribution } from "../contribution";
import { getSourceProcedureMeta } from "../procedure";
import { sourcePortRows } from "../port-map";
import {
  createIntegrationManagementProcedures,
  pendingIntegrationManagementPaths,
  pendingIntegrationManagementSchemas,
  portedIntegrationManagementPaths,
} from "../routers/integration";
import type { IntegrationManagementResources, NativeConnectionInput } from "../routers/integration";

if (process.argv.includes("--typecheck")) {
  const { API } = await import("typescript/unstable/async");
  const api = new API({ cwd: process.cwd() });
  try {
    const config = path.resolve("packages/api/src/nitro/tsconfig.json");
    const snapshot = await api.updateSnapshot({ openProjects: [config] });
    try {
      const project = snapshot.getProject(config);
      if (!project) throw new Error("Missing scoped backend project");
      const files = project.rootFiles.filter(
        (file) =>
          file.endsWith("/routers/integration.ts") ||
          file.includes("/routers/-integration-management/") ||
          file.endsWith("/checks/integration-management.mts"),
      );
      const diagnostics = [...(await project.program.getProgramDiagnostics())];
      for (const file of files)
        diagnostics.push(
          ...(await project.program.getSyntacticDiagnostics(file)),
          ...(await project.program.getSemanticDiagnostics(file)),
        );
      console.log(
        JSON.stringify(
          { candidate: "homarr.backend.integration-management.v1", ownedFiles: files.length, diagnostics },
          null,
          2,
        ),
      );
      process.exitCode = diagnostics.length ? 1 : 0;
    } finally {
      await snapshot.dispose();
    }
  } finally {
    await api.close();
  }
}

async function expectCode(operation: Promise<unknown>, code: string) {
  await assert.rejects(operation, (error: unknown) => error instanceof ORPCError && error.code === code);
}

interface Step {
  readonly name: string;
  readonly value: unknown;
  after?(): void;
}
interface QueryCall {
  readonly name: string;
  readonly options: Record<string, unknown>;
}

function scriptedDatabase(steps: readonly Step[]) {
  let next = 0;
  const calls: QueryCall[] = [];
  const consume = (name: string, options: Record<string, unknown>) => {
    const step = steps[next++];
    assert.equal(step?.name, name, "Unexpected fixture database operation");
    calls.push({ name, options });
    step?.after?.();
    return Promise.resolve(step?.value);
  };
  const fixture = {
    query: new Proxy(
      {},
      {
        get(_target, table) {
          return new Proxy(
            {},
            {
              get(_query, method) {
                return (options: Record<string, unknown>) => consume(`${String(table)}.${String(method)}`, options);
              },
            },
          );
        },
      },
    ),
    delete(table: unknown) {
      return {
        where(where: unknown) {
          return consume("delete", { table, where });
        },
      };
    },
  };
  return {
    db: fixture as unknown as Database,
    calls,
    done() {
      assert.equal(next, steps.length);
    },
  };
}

const principal: Extract<BackendPrincipal, { kind: "authenticated" }> = {
  kind: "authenticated",
  user: { id: "fixture-user", permissions: [], colorScheme: "dark", name: null, email: null, image: null },
};
const request = new Request("https://disposable.invalid/rpc");

function context(db: Database, overrides: Partial<BackendContext> = {}): BackendContext {
  return {
    request,
    signal: request.signal,
    db,
    principal,
    deviceType: undefined,
    demo: { enabled: false, readOnly: false },
    setup: {
      async isClaimOnlyAccessAllowed() {
        throw new Error("Management must not use setup authority");
      },
      async currentStep() {
        throw new Error("Management must not use setup authority");
      },
    },
    effect() {
      throw new Error("Management must not emit fixture response effects");
    },
    onDispose() {
      throw new Error("Management must not register host fixture lifetimes");
    },
    ...overrides,
  };
}

function fixtureResources(db: Database) {
  const codec = createSecretCodec("12".repeat(32));
  const state = {
    current: true,
    snapshots: 0,
    releasedSnapshots: 0,
    decryptions: 0,
    nativeAcquisitions: 0,
    nativeCalls: 0,
    releasedNative: 0,
    revokeDuringNativeAcquisition: false,
  };
  const nativeInputs: NativeConnectionInput[] = [];
  const logs: { message: string; metadata: Readonly<Record<string, string>> }[] = [];
  const invalidated: string[] = [];
  let result: IntegrationConnectionResult = { success: true };
  const assertCurrentAsync = async () => {
    if (!state.current) throw new ORPCError("NOT_FOUND", { message: "Integration not found" });
  };
  const resources: IntegrationManagementResources = {
    tables,
    operators: { eq, inArray, asc, like },
    codec: {
      decryptSecret(value) {
        state.decryptions++;
        return codec.decryptSecret(value);
      },
    },
    async acquireSnapshotAsync(operation) {
      assert.equal(operation.principal.user.id, principal.user.id);
      state.snapshots++;
      return {
        db,
        principal: operation.principal,
        assertCurrentAsync,
        async releaseAsync() {
          state.releasedSnapshots++;
        },
      };
    },
    async acquireNativeClientAsync(input, scope) {
      await scope.assertCurrentAsync();
      scope.signal.throwIfAborted();
      state.nativeAcquisitions++;
      nativeInputs.push(input);
      if (state.revokeDuringNativeAcquisition) state.current = false;
      return {
        client: {
          async testConnectionAsync() {
            state.nativeCalls++;
            return result;
          },
        },
        async releaseAsync() {
          state.releasedNative++;
        },
      };
    },
    async invalidateIntegrationCacheAsync(id) {
      invalidated.push(id);
    },
    logger: {
      info(message, metadata) {
        logs.push({ message, metadata });
      },
      warn(message, metadata) {
        logs.push({ message, metadata });
      },
    },
  };
  return {
    resources,
    codec,
    state,
    nativeInputs,
    logs,
    invalidated,
    setResult(value: IntegrationConnectionResult) {
      result = value;
    },
  };
}

const grantedRow = {
  id: "saved",
  userPermissions: [{ integrationId: "saved", userId: principal.user.id, permission: "full" }],
  groupPermissions: [],
};
const grantSteps = (): Step[] => [
  { name: "groupMembers.findMany", value: [] },
  { name: "integrations.findMany", value: [grantedRow] },
];

async function checkManagement() {
  let deniedDatabaseTouches = 0;
  const deniedDatabase = new Proxy({} as Database, {
    get() {
      deniedDatabaseTouches++;
      throw new Error("Denied operation accessed SQL");
    },
  });
  const denial = fixtureResources(deniedDatabase);
  const router = createIntegrationManagementProcedures(denial.resources);
  defineBackendContribution({
    revision: backendContractRevision,
    id: "fixture-management",
    router: { integration: router },
    leaves: portedIntegrationManagementPaths,
  });
  assert.equal(portedIntegrationManagementPaths.length, 10);
  assert.equal(pendingIntegrationManagementPaths.length, 4);
  assert.deepEqual(
    [...portedIntegrationManagementPaths, ...pendingIntegrationManagementPaths].toSorted(),
    sourcePortRows
      .filter(([leaf, , owner]) => leaf.startsWith("integration.") && owner === "41")
      .map(([leaf]) => leaf)
      .toSorted(),
  );
  for (const leaf of pendingIntegrationManagementPaths)
    assert.equal(Object.hasOwn(router, leaf.slice("integration.".length)), false);
  for (const [name, procedure] of Object.entries(router))
    assert.equal(getSourceProcedureMeta(procedure)?.path, `integration.${name}`);

  const kinds = await call(router.getKinds, undefined, {
    context: context(deniedDatabase, { principal: { kind: "anonymous" } }),
  });
  assert.deepEqual(
    kinds.map(({ kind }) => kind),
    Object.keys(integrationDefs),
  );
  const miniflux = kinds.find(({ kind }) => kind === "miniflux");
  assert.deepEqual(miniflux?.requiredSecrets, integrationDefs.miniflux.secretKinds);
  await expectCode(
    call(router.byId, { id: "saved" }, { context: context(deniedDatabase, { principal: { kind: "anonymous" } }) }),
    "UNAUTHORIZED",
  );
  await expectCode(
    call(
      router.testConnection,
      { id: "saved" },
      { context: context(deniedDatabase, { principal: { kind: "anonymous" } }) },
    ),
    "UNAUTHORIZED",
  );
  await expectCode(
    call(
      router.delete,
      { id: "saved" },
      { context: context(deniedDatabase, { demo: { enabled: true, readOnly: true } }) },
    ),
    "FORBIDDEN",
  );
  await expectCode(
    call(router.search, { query: "saved", limit: 101 }, { context: context(deniedDatabase) }),
    "BAD_REQUEST",
  );
  assert.equal(denial.state.snapshots, 0);
  assert.equal(denial.state.decryptions, 0);
  assert.equal(denial.state.nativeAcquisitions, 0);
  assert.equal(deniedDatabaseTouches, 0);

  const publicIdsSql = scriptedDatabase([
    { name: "integrations.findMany", value: [{ id: "saved", kind: "miniflux" }] },
  ]);
  const publicIds = fixtureResources(publicIdsSql.db);
  assert.deepEqual(
    await call(createIntegrationManagementProcedures(publicIds.resources).byIds, ["saved"], {
      context: context(publicIdsSql.db, { principal: { kind: "anonymous" } }),
    }),
    [{ id: "saved", kind: "miniflux" }],
  );
  assert.deepEqual(publicIdsSql.calls[0]?.options.columns, { id: true, kind: true });
  assert.equal(publicIds.state.snapshots, 0);
  assert.equal(publicIds.state.decryptions, 0);
  publicIdsSql.done();

  const useOnly = scriptedDatabase([
    { name: "groupMembers.findMany", value: [] },
    {
      name: "integrations.findMany",
      value: [
        { ...grantedRow, userPermissions: [{ integrationId: "saved", userId: principal.user.id, permission: "use" }] },
      ],
    },
  ]);
  const useFixture = fixtureResources(useOnly.db);
  await expectCode(
    call(
      createIntegrationManagementProcedures(useFixture.resources).testConnection,
      { id: "saved" },
      { context: context(useOnly.db) },
    ),
    "NOT_FOUND",
  );
  assert.equal(useFixture.state.decryptions, 0);
  assert.equal(useFixture.state.nativeAcquisitions, 0);
  assert.equal(useFixture.state.releasedSnapshots, 1);
  useOnly.done();

  const codec = createSecretCodec("12".repeat(32));
  const updatedAt = new Date("2026-01-01T00:00:00Z");
  const publicValue = codec.encryptSecret("fixture-public-user");
  const privateValue = codec.encryptSecret("fixture-private-token");
  const projectionSql = scriptedDatabase([
    ...grantSteps(),
    {
      name: "integrations.findFirst",
      value: {
        id: "saved",
        name: "Saved",
        kind: "miniflux",
        url: "https://disposable.invalid/service",
        secrets: [
          { kind: "username", value: publicValue, updatedAt },
          { kind: "apiKey", value: privateValue, updatedAt },
        ],
        app: { id: "linked-app", name: "App", iconUrl: "icon", href: "https://disposable.invalid/app" },
      },
    },
  ]);
  const projection = fixtureResources(projectionSql.db);
  const output = await call(
    createIntegrationManagementProcedures(projection.resources).byId,
    { id: "saved" },
    { context: context(projectionSql.db) },
  );
  assert.deepEqual(output.secrets, [
    { kind: "username", value: "fixture-public-user", updatedAt },
    { kind: "apiKey", value: null, updatedAt },
  ]);
  assert.equal(projection.state.decryptions, 1);
  assert.equal(JSON.stringify(output).includes(privateValue), false);
  assert.equal(JSON.stringify(output).includes("fixture-private-token"), false);
  assert.deepEqual(Object.keys(output).toSorted(), ["app", "id", "kind", "name", "secrets", "url"]);
  projectionSql.done();

  const revokedSql = scriptedDatabase([
    ...grantSteps(),
    {
      name: "integrations.findFirst",
      value: {
        id: "saved",
        name: "Saved",
        kind: "miniflux",
        url: "https://disposable.invalid/service",
        secrets: [{ kind: "username", value: publicValue, updatedAt }],
        app: null,
      },
      after() {
        revoked.state.current = false;
      },
    },
  ]);
  const revoked = fixtureResources(revokedSql.db);
  await expectCode(
    call(
      createIntegrationManagementProcedures(revoked.resources).byId,
      { id: "saved" },
      { context: context(revokedSql.db) },
    ),
    "NOT_FOUND",
  );
  assert.equal(revoked.state.decryptions, 0);
  assert.equal(revoked.state.releasedSnapshots, 1);
  revokedSql.done();

  const storedTestSql = scriptedDatabase([
    ...grantSteps(),
    {
      name: "integrations.findFirst",
      value: {
        id: "saved",
        name: "Saved",
        kind: "miniflux",
        url: "https://disposable.invalid/service",
        appId: null,
        secrets: [{ kind: "apiKey", value: privateValue, updatedAt }],
      },
    },
  ]);
  const storedTest = fixtureResources(storedTestSql.db);
  const rawFailure = {
    success: false as const,
    error: {
      type: "authorization" as const,
      statusCode: 401,
      message: "fixture-private-token",
      response: "fixture-credential-body",
    },
  };
  storedTest.setResult(rawFailure);
  const tested = await call(
    createIntegrationManagementProcedures(storedTest.resources).testConnection,
    { id: "saved" },
    { context: context(storedTestSql.db) },
  );
  assert.deepEqual(tested, { success: false, error: "authorization" });
  assert.deepEqual(storedTest.nativeInputs[0]?.decryptedSecrets, [{ kind: "apiKey", value: "fixture-private-token" }]);
  assert.equal(storedTest.nativeInputs[0]?.externalUrl, null);
  assert.equal(storedTest.state.nativeCalls, 1);
  assert.equal(storedTest.state.releasedNative, 1);
  assert.equal(storedTest.state.releasedSnapshots, 1);
  assert.equal(JSON.stringify(storedTest.logs).includes("fixture-private-token"), false);
  storedTestSql.done();

  const lateSql = scriptedDatabase([
    ...grantSteps(),
    {
      name: "integrations.findFirst",
      value: {
        id: "saved",
        name: "Saved",
        kind: "miniflux",
        url: "https://disposable.invalid/service",
        appId: null,
        secrets: [{ kind: "apiKey", value: privateValue, updatedAt }],
      },
    },
  ]);
  const late = fixtureResources(lateSql.db);
  late.state.revokeDuringNativeAcquisition = true;
  await expectCode(
    call(
      createIntegrationManagementProcedures(late.resources).testConnection,
      { id: "saved" },
      { context: context(lateSql.db) },
    ),
    "NOT_FOUND",
  );
  assert.equal(late.state.nativeCalls, 0);
  assert.equal(late.state.releasedNative, 1);
  assert.equal(late.state.releasedSnapshots, 1);
  lateSql.done();

  const missingSql = scriptedDatabase([
    ...grantSteps(),
    {
      name: "integrations.findFirst",
      value: {
        id: "saved",
        name: "Saved",
        kind: "miniflux",
        url: "https://disposable.invalid/service",
        appId: null,
        secrets: [{ kind: "apiKey", value: "invalid.ciphertext", updatedAt }],
      },
    },
  ]);
  const missing = fixtureResources(missingSql.db);
  const missingResult = await call(
    createIntegrationManagementProcedures(missing.resources).testConnection,
    { id: "saved" },
    { context: context(missingSql.db) },
  );
  assert.deepEqual(missingResult, { success: false, error: "missingSecret" });
  assert.equal(missing.state.nativeAcquisitions, 0);
  assert.equal(JSON.stringify(missing.logs).includes("invalid.ciphertext"), false);
  missingSql.done();

  const deletedSql = scriptedDatabase([
    ...grantSteps(),
    { name: "integrations.findFirst", value: { id: "saved" } },
    { name: "delete", value: undefined },
  ]);
  const deleted = fixtureResources(deletedSql.db);
  await call(
    createIntegrationManagementProcedures(deleted.resources).delete,
    { id: "saved" },
    { context: context(deletedSql.db) },
  );
  assert.deepEqual(deleted.invalidated, ["saved"]);
  assert.equal(deleted.state.decryptions, 0);
  deletedSql.done();

  assert.equal(
    pendingIntegrationManagementSchemas.create.safeParse({
      name: "New",
      url: "file:///fixture",
      kind: "miniflux",
      secrets: [],
      attemptSearchEngineCreation: false,
    }).success,
    false,
  );
  assert.equal(
    pendingIntegrationManagementSchemas.update.safeParse({
      id: "saved",
      name: "Saved",
      url: "file:///fixture",
      secrets: [],
      appId: null,
    }).success,
    true,
  );
  console.log(
    JSON.stringify({
      candidate: "homarr.backend.integration-management.v1",
      implemented: 10,
      pending: 4,
      deniedDatabaseTouches,
      scriptedSnapshotEvidence: true,
      nativeClientFixtureOnly: true,
      actualSqlVerified: false,
      nativeRuntimeJoinVerified: false,
      productionAuthVerified: false,
      externalCalls: 0,
    }),
  );
}

if (!process.argv.includes("--typecheck")) await checkManagement();
