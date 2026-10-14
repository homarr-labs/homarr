import assert from "node:assert/strict";
import path from "node:path";
import { call, ORPCError } from "@orpc/server";
import { and, asc, eq, inArray, like, max, not, or } from "drizzle-orm";
import { createSelectSchema } from "drizzle-zod";

import { comparePasswordsAsync, hashPasswordAsync } from "@homarr/auth/security";
import type { Database } from "@homarr/db";
import { defaultHeaderPreferences, userByteUnitSystemSchema } from "@homarr/validation/user";
import {
  createBoardHeaderItem,
  parseHeaderPreferences,
  serializeHeaderPreferences,
} from "@homarr/validation/header-preferences";

import * as tables from "../../../../db/schema/sqlite";
import { backendContractRevision } from "../context";
import type { BackendContext, BackendPrincipal } from "../context";
import { defineBackendContribution } from "../contribution";
import { sourcePortRows } from "../port-map";
import { getSourceProcedureMeta, getSourceProjectionMeta } from "../procedure";
import { createApiKeyProcedures, pendingApiKeyPaths, portedApiKeyPaths } from "../routers/api-keys";
import { createGroupAdministrationProcedures, pendingGroupPaths, portedGroupPaths } from "../routers/group";
import { createInviteProcedures, pendingInvitePaths, portedInvitePaths } from "../routers/invite";
import { createUserProcedures, pendingUserPaths, portedUserPaths } from "../routers/user";
import type { IdentityProcedureResources } from "../routers/-identity/resources";

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
          /\/routers\/(user|group|invite|api-keys)\.ts$/.test(file) ||
          file.includes("/routers/-identity/") ||
          file.endsWith("/checks/identity.mts"),
      );
      const diagnostics = [...(await project.program.getProgramDiagnostics())];
      for (const file of files) {
        diagnostics.push(
          ...(await project.program.getSyntacticDiagnostics(file)),
          ...(await project.program.getSemanticDiagnostics(file)),
        );
      }
      console.log(
        JSON.stringify({ candidate: "homarr.backend.identity.v1", ownedFiles: files.length, diagnostics }, null, 2),
      );
      process.exitCode = diagnostics.length ? 1 : 0;
    } finally {
      await snapshot.dispose();
    }
  } finally {
    await api.close();
  }
} else {
  await checkIdentity();
}

async function checkIdentity() {
  let databaseTouches = 0;
  const deniedDatabase = new Proxy({} as Database, {
    get() {
      databaseTouches++;
      throw new Error("Denied operation accessed persistence");
    },
  });
  const principal: Extract<BackendPrincipal, { kind: "authenticated" }> = {
    kind: "authenticated",
    user: { id: "fixture-user", permissions: [], colorScheme: "dark", name: null, email: null, image: null },
  };
  const admin: BackendPrincipal = { kind: "authenticated", user: { ...principal.user, permissions: ["admin"] } };
  const request = new Request("https://disposable.invalid/rpc");
  const context = (overrides: Partial<BackendContext> = {}): BackendContext => ({
    request,
    signal: request.signal,
    db: deniedDatabase,
    principal,
    deviceType: undefined,
    demo: { enabled: false, readOnly: false },
    setup: {
      async isClaimOnlyAccessAllowed() {
        throw new Error("Identity checks must not invoke setup authority");
      },
      async currentStep() {
        throw new Error("Identity checks must not invoke setup authority");
      },
    },
    effect() {
      throw new Error("Identity checks must not emit response effects");
    },
    onDispose() {
      throw new Error("Identity checks must not register runtime resources");
    },
    ...overrides,
  });
  let providers: ReturnType<IdentityProcedureResources["providers"]> = {
    enabled: ["credentials"],
    oidcGroupsLocalManagement: false,
  };
  const logs: Record<string, unknown>[] = [];
  const resources: IdentityProcedureResources = {
    tables,
    operators: { eq, and, or, inArray, like, not, asc, max },
    validation: {
      selectUserSchema: createSelectSchema(tables.users, {
        byteUnitSystem: userByteUnitSystemSchema.shape.byteUnitSystem,
      }),
      selectInviteSchema: createSelectSchema(tables.invites),
    },
    createId: () => "fixture-created-id",
    providers: () => providers,
    logger: {
      info(_message, metadata) {
        logs.push(metadata);
      },
    },
  };
  const router = {
    user: createUserProcedures(resources),
    group: createGroupAdministrationProcedures(resources),
    invite: createInviteProcedures(resources),
    apiKeys: createApiKeyProcedures(resources),
  };
  const leaves = [...portedUserPaths, ...portedGroupPaths, ...portedInvitePaths, ...portedApiKeyPaths];
  const pending = [...pendingUserPaths, ...pendingGroupPaths, ...pendingInvitePaths, ...pendingApiKeyPaths];
  defineBackendContribution({ revision: backendContractRevision, id: "fixture-identity", router, leaves });
  assert.equal(leaves.length, 41);
  assert.equal(pending.length, 6);
  assert.deepEqual(
    [...leaves, ...pending].toSorted(),
    sourcePortRows
      .filter(([leaf]) => /^(user|group|invite|apiKeys)\./.test(leaf))
      .map(([leaf]) => leaf)
      .toSorted(),
  );
  for (const [family, procedures] of Object.entries(router)) {
    for (const [name, procedure] of Object.entries(procedures)) {
      const descriptor = getSourceProcedureMeta(procedure);
      assert.equal(descriptor?.path, `${family}.${name}`);
      assert.equal(
        descriptor?.kind,
        sourcePortRows.find(([leaf]) => leaf === descriptor?.path)?.[1] === "Q" ? "query" : "mutation",
      );
    }
  }
  assert.throws(
    () =>
      defineBackendContribution({
        revision: backendContractRevision,
        id: "fixture-renamed",
        router: { user: { renamed: router.user.getPreferences } },
        leaves: ["user.getPreferences"],
      }),
    /Source procedure route does not match its declared identity/,
  );
  assert.equal(getSourceProjectionMeta(router.apiKeys.create)?.mcp?.enabled, false);

  await expectCode(call(router.user.getAll, undefined, { context: context() }), "FORBIDDEN");
  await expectCode(call(router.group.getById, { id: "unread" }, { context: context() }), "FORBIDDEN");
  await expectCode(
    call(router.invite.createInvite, { expirationDate: "2030-01-01T00:00:00Z" }, { context: context() }),
    "FORBIDDEN",
  );
  await expectCode(call(router.apiKeys.create, undefined, { context: context() }), "FORBIDDEN");
  await expectCode(
    call(router.user.getPreferences, {}, { context: context({ principal: { kind: "anonymous" } }) }),
    "UNAUTHORIZED",
  );
  await expectCode(call(router.user.getPreferences, { userId: "another" }, { context: context() }), "NOT_FOUND");
  await expectCode(
    call(router.user.setProfileImage, { userId: "another", image: null }, { context: context() }),
    "FORBIDDEN",
  );
  await expectCode(
    call(
      router.user.changePassword,
      {
        userId: "another",
        previousPassword: "not-verified",
        password: "fixture-new-password",
        confirmPassword: "fixture-new-password",
      },
      { context: context() },
    ),
    "NOT_FOUND",
  );
  await expectCode(
    call(
      router.user.updatePreferences,
      { colorScheme: "light" },
      { context: context({ demo: { enabled: true, readOnly: true } }) },
    ),
    "FORBIDDEN",
  );
  await expectCode(
    call(
      router.user.changePassword,
      {
        userId: principal.user.id,
        previousPassword: "not-verified",
        password: "fixture-new-password",
        confirmPassword: "fixture-new-password",
      },
      { context: context({ principal: admin, demo: { enabled: true, readOnly: false } }) },
    ),
    "FORBIDDEN",
  );
  providers = { enabled: ["ldap"], oidcGroupsLocalManagement: false };
  await expectCode(call(router.invite.getAll, undefined, { context: context({ principal: admin }) }), "FORBIDDEN");
  providers = { enabled: ["credentials"], oidcGroupsLocalManagement: false };
  await expectCode(
    call(router.user.updatePreferences, { userId: principal.user.id }, { context: context() }),
    "BAD_REQUEST",
  );
  const unknownPreference = { colorScheme: "light" as const, password: "must-not-be-accepted" };
  await expectCode(call(router.user.updatePreferences, unknownPreference, { context: context() }), "BAD_REQUEST");
  await expectCode(
    call(
      router.user.setProfileImage,
      { userId: principal.user.id, image: "https://disposable.invalid/image.png" },
      { context: context() },
    ),
    "BAD_REQUEST",
  );
  await expectCode(
    call(router.invite.createInvite, { expirationDate: "not-a-date" }, { context: context({ principal: admin }) }),
    "BAD_REQUEST",
  );
  assert.equal(databaseTouches, 0);
  assert.equal(logs.length, 0);

  const preferenceRow = {
    colorScheme: "dark",
    byteUnitSystem: "binary",
    firstDayOfWeek: 1,
    pingIconsEnabled: false,
    enableRightClickOnWidgets: true,
    homeBoardId: "old-home",
    mobileHomeBoardId: null,
    defaultSearchEngineId: null,
    openSearchInNewTab: true,
    ddgBangs: true,
    headerPreferences: serializeHeaderPreferences(defaultHeaderPreferences),
  };
  const preferenceFixture = scriptedDatabase([
    { name: "users.findFirst", result: preferenceRow },
    { name: "update", result: undefined },
  ]);
  const patched = await call(
    router.user.updatePreferences,
    { homeBoardId: null, pingIconsEnabled: false, headerPreferences: { searchDisplay: "icon" } },
    { context: context({ db: preferenceFixture.db }) },
  );
  assert.equal(patched.homeBoardId, null);
  assert.equal(patched.openSearchInNewTab, true);
  assert.equal(patched.pingIconsEnabled, false);
  assert.deepEqual(patched.headerPreferences.zones, defaultHeaderPreferences.zones);
  assert.equal(patched.headerPreferences.searchDisplay, "icon");
  const writtenPreferences = preferenceFixture.calls[1]?.values;
  assert.equal(writtenPreferences?.homeBoardId, null);
  assert.equal(writtenPreferences?.pingIconsEnabled, false);
  assert.equal(Object.hasOwn(writtenPreferences ?? {}, "openSearchInNewTab"), false);
  assert.deepEqual(parseHeaderPreferences(writtenPreferences?.headerPreferences).zones, defaultHeaderPreferences.zones);
  preferenceFixture.done();

  const invalidReference = scriptedDatabase([
    { name: "users.findFirst", result: preferenceRow },
    { name: "searchEngines.findFirst", result: undefined },
  ]);
  await expectCode(
    call(
      router.user.updatePreferences,
      { defaultSearchEngineId: "missing" },
      { context: context({ db: invalidReference.db }) },
    ),
    "BAD_REQUEST",
  );
  invalidReference.done();

  const inaccessibleShortcut = scriptedDatabase([
    { name: "users.findFirst", result: preferenceRow },
    { name: "boardUserPermissions.findMany", result: [] },
    { name: "groupMembers.findMany", result: [] },
    { name: "users.findFirst", result: { homeBoardId: null, mobileHomeBoardId: null } },
    { name: "boards.findMany", result: [] },
  ]);
  await expectCode(
    call(
      router.user.updatePreferences,
      {
        userId: "target-user",
        headerPreferences: {
          zones: { right: [...defaultHeaderPreferences.zones.right, createBoardHeaderItem("inaccessible")] },
        },
      },
      { context: context({ db: inaccessibleShortcut.db, principal: admin }) },
    ),
    "BAD_REQUEST",
  );
  inaccessibleShortcut.done();

  const reservedGroup = scriptedDatabase([
    { name: "groups.findFirst", result: { id: "reserved" } },
    { name: "$count", result: 1 },
  ]);
  await expectCode(
    call(
      router.group.deleteGroup,
      { id: "reserved" },
      { context: context({ db: reservedGroup.db, principal: admin }) },
    ),
    "FORBIDDEN",
  );
  reservedGroup.done();
  const externalMember = scriptedDatabase([
    { name: "groups.findFirst", result: { id: "group" } },
    { name: "$count", result: 0 },
    { name: "users.findFirst", result: { provider: "ldap" } },
  ]);
  await expectCode(
    call(
      router.group.addMember,
      { groupId: "group", userId: "external" },
      { context: context({ db: externalMember.db, principal: admin }) },
    ),
    "FORBIDDEN",
  );
  externalMember.done();

  const hash = await hashPasswordAsync("fixture-old-password");
  const selfPassword = scriptedDatabase([
    { name: "users.findFirst", result: { id: principal.user.id, provider: "credentials", password: hash } },
  ]);
  await expectCode(
    call(
      router.user.changePassword,
      {
        userId: principal.user.id,
        previousPassword: "incorrect",
        password: "fixture-new-password",
        confirmPassword: "fixture-new-password",
      },
      { context: context({ db: selfPassword.db, principal: admin }) },
    ),
    "FORBIDDEN",
  );
  selfPassword.done();
  assert.equal(logs[0]?.previousPasswordRequired, true);
  const otherPassword = scriptedDatabase([
    { name: "users.findFirst", result: { id: "another", provider: "credentials", password: hash } },
    { name: "update", result: undefined },
  ]);
  await call(
    router.user.changePassword,
    {
      userId: "another",
      previousPassword: "not-verified",
      password: "fixture-new-password",
      confirmPassword: "fixture-new-password",
    },
    { context: context({ db: otherPassword.db, principal: admin }) },
  );
  const writtenHash = otherPassword.calls[1]?.values?.password;
  assert.ok(typeof writtenHash === "string");
  assert.equal(await comparePasswordsAsync("fixture-new-password", writtenHash), true);
  assert.equal(logs[1]?.previousPasswordRequired, false);
  assert.deepEqual(Object.keys(logs[1] ?? {}).toSorted(), ["actorId", "previousPasswordRequired", "targetUserId"]);
  otherPassword.done();

  const inviteFixture = scriptedDatabase([
    {
      name: "invites.findMany",
      result: [
        {
          id: "invitation",
          expirationDate: new Date("2030-01-01"),
          creator: { id: "creator", name: null },
          token: "fixture-must-not-project",
        },
      ],
    },
  ]);
  const invitations = await call(router.invite.getAll, undefined, {
    context: context({ db: inviteFixture.db, principal: admin }),
  });
  assert.equal(Object.hasOwn(invitations[0] ?? {}, "token"), false);
  assert.deepEqual(inviteFixture.calls[0]?.options?.columns, { token: false });
  inviteFixture.done();
  console.log(
    JSON.stringify({
      candidate: "homarr.backend.identity.v1",
      nativeUnmountedLeaves: leaves.length,
      additionalLeaves: leaves.length - 3,
      pendingLeaves: pending.length,
      deniedDatabaseTouches: databaseTouches,
      scriptedDomainFixtures: true,
      actualSqlVerified: false,
      productionAuthVerified: false,
      externalCalls: 0,
    }),
  );
}

async function expectCode(operation: Promise<unknown>, code: string) {
  await assert.rejects(operation, (error: unknown) => error instanceof ORPCError && error.code === code);
}

interface ScriptStep {
  readonly name: string;
  readonly result: unknown;
}
interface ScriptCall {
  readonly name: string;
  readonly options?: Record<string, unknown>;
  readonly values?: Record<string, unknown>;
}

function scriptedDatabase(steps: readonly ScriptStep[]) {
  const calls: ScriptCall[] = [];
  let next = 0;
  function consume(operation: ScriptCall) {
    const step = steps[next++];
    assert.equal(operation.name, step?.name, "Unexpected fixture database operation");
    calls.push(operation);
    return Promise.resolve(step?.result);
  }
  const query = new Proxy(
    {},
    {
      get(_target, table) {
        return new Proxy(
          {},
          {
            get(_query, method) {
              return (options: Record<string, unknown>) =>
                consume({ name: `${String(table)}.${String(method)}`, options });
            },
          },
        );
      },
    },
  );
  const fixture = {
    query,
    $count: () => consume({ name: "$count" }),
    update(table: unknown) {
      assert.ok(table);
      return {
        set(values: Record<string, unknown>) {
          return {
            where(where: unknown) {
              assert.ok(where);
              return consume({ name: "update", values });
            },
          };
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
