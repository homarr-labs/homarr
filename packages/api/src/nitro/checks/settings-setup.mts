import assert from "node:assert/strict";
import { call, ORPCError } from "@orpc/server";
import { and, eq, getTableName, inArray, like, or } from "drizzle-orm";
import type { SQL, Table } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

import type { Database } from "@homarr/db";
import { defaultServerSettings, defaultServerSettingsKeys } from "@homarr/server-settings";
import { everyoneGroup } from "@homarr/definitions";
import * as tables from "../../../../db/schema/sqlite";
import { dockerLabels } from "../../../../docker/src/labels";
import { createDockerSourceId } from "../../../../docker/src/discovery/parse-container-labels";
import { snapshotPolicyIdentity } from "../../../../auth/nitro/policy/identity";
import { constructIntegrationPermissions, decideBoardAccess } from "../../../../auth/nitro/policy/resources";

import { backendContractRevision, createBackendContext } from "../context";
import type { BackendContext, BackendPrincipal } from "../context";
import { defineBackendContribution } from "../contribution";
import { sourcePortRows } from "../port-map";
import {
  createServerSettingsProcedures,
  serverSettingsImplementedPaths,
  serverSettingsPendingPaths,
} from "../routers/server-settings";
import { createOnboardProcedures, onboardImplementedPaths, onboardPendingPaths } from "../routers/onboard";
import {
  createHomeProcedures,
  createHomeTargetResolver,
  homeImplementedPaths,
  homePendingPaths,
} from "../routers/home";
import { settingsCodec } from "../routers/-settings-setup/settings";
import type { SetupIntegrationClientResources } from "../routers/-settings-setup/integration-test";

const operators = { and, eq, inArray, like, or };
const settingsResources = { serverSettings: tables.serverSettings, operators, codec: settingsCodec };
const serverSettings = createServerSettingsProcedures({ ...settingsResources, boards: tables.boards, inArray });
let externalCalls = 0;
let testedIntegration: Parameters<SetupIntegrationClientResources["createIntegration"]>[0] | undefined;
const onboard = createOnboardProcedures({
  integrations: {
    info() {},
    async createIntegration(input) {
      externalCalls++;
      testedIntegration = input;
      return {
        async testConnectionAsync() {
          return { success: false };
        },
      };
    },
  },
  capabilities: {
    kubernetesEnabled: false,
    workshopApiUrl: "https://workshop.disposable.invalid///",
    async getKubernetesVersion() {
      throw new Error("Disabled Kubernetes must not be invoked");
    },
    async fetch(input, init) {
      externalCalls++;
      assert.equal(input, "https://workshop.disposable.invalid/api/health");
      assert.equal(new Headers(init?.headers).get("accept"), "application/json");
      return new Response(null, { status: 200 });
    },
  },
  discovery: {
    dockerLabels,
    createDockerSourceId,
    icons: tables.icons,
    operators,
    async listDiscoveredContainers() {
      externalCalls++;
      return { hosts: [], services: [] };
    },
    warn() {
      throw new Error("Unexpected discovery warning");
    },
  },
});
const policy = {
  snapshotIdentity: snapshotPolicyIdentity,
  integrationPermissions: constructIntegrationPermissions,
  decideBoardAccess,
};
const home = createHomeProcedures({ tables, operators, credentialsEnabled: false, policy });
const resolveHomeTarget = createHomeTargetResolver({
  policy,
  ...settingsResources,
  boards: tables.boards,
  users: tables.users,
  groups: tables.groups,
  groupMembers: tables.groupMembers,
});
const implemented = [...serverSettingsImplementedPaths, ...onboardImplementedPaths, ...homeImplementedPaths];
const pending = [...serverSettingsPendingPaths, ...onboardPendingPaths.map(({ path }) => path), ...homePendingPaths];
const allocated = sourcePortRows
  .filter(([path]) => path.startsWith("serverSettings.") || path.startsWith("onboard.") || path.startsWith("home."))
  .map(([path]) => path);
assert.equal(implemented.length, 11);
assert.equal(pending.length, 2);
assert.equal(allocated.length, 13);
assert.deepEqual([...implemented, ...pending].toSorted(), allocated.toSorted());
assert.equal("nextStep" in onboard, false);
assert.equal("completeSetup" in onboard, false);
defineBackendContribution({
  revision: backendContractRevision,
  id: "disposable-settings-setup",
  router: { serverSettings, onboard, home },
  leaves: implemented,
});

const anonymous: BackendPrincipal = { kind: "anonymous" };
const member: BackendPrincipal = {
  kind: "authenticated",
  user: { id: "fixture-member", permissions: [], name: null, email: null, image: null, colorScheme: "auto" },
};
const admin: BackendPrincipal = { kind: "authenticated", user: { ...member.user, permissions: ["admin"] } };
let deniedDatabaseTouches = 0;
const deniedDatabase = new Proxy({} as Database, {
  get() {
    deniedDatabaseTouches++;
    throw new Error("Denied operation accessed persistence");
  },
});
function context(
  db: Database,
  principal: BackendPrincipal = anonymous,
  overrides: Partial<BackendContext> = {},
): BackendContext {
  const request = new Request("https://fixture.invalid/rpc", {
    method: "POST",
    headers: { cookie: "homarr-onboarding-claim=spoofed", "x-user-id": "fixture-admin", "x-admin": "true" },
  });
  return createBackendContext({
    db,
    principal,
    request,
    signal: request.signal,
    deviceType: undefined,
    demo: { enabled: false, readOnly: false },
    setup: {
      async isClaimOnlyAccessAllowed() {
        return false;
      },
      async currentStep() {
        return "setup";
      },
    },
    effect() {
      throw new Error("Unexpected response effect");
    },
    onDispose() {},
    ...overrides,
  });
}
async function expectCode(operation: Promise<unknown>, code: string) {
  await assert.rejects(operation, (error: unknown) => error instanceof ORPCError && error.code === code);
}
const integrationDraft = {
  name: "Fixture Plex",
  sourceId: "docker:fixture:plex",
  url: "https://plex.disposable.invalid",
  kind: "plex" as const,
  secrets: [{ kind: "apiKey" as const, value: "synthetic-not-a-credential" }],
};
await expectCode(call(serverSettings.getAll, undefined, { context: context(deniedDatabase) }), "UNAUTHORIZED");
await expectCode(
  call(
    serverSettings.saveSettings,
    { settingsKey: "user", value: { enableGravatar: false } },
    { context: context(deniedDatabase, member) },
  ),
  "FORBIDDEN",
);
await expectCode(
  call(
    serverSettings.updateBoardSettings,
    { homeBoardId: null },
    { context: context(deniedDatabase, admin, { demo: { enabled: true, readOnly: true } }) },
  ),
  "FORBIDDEN",
);
await expectCode(
  call(onboard.testIntegration, integrationDraft, {
    context: context(deniedDatabase, anonymous, { onboardingClaimToken: "spoofed" }),
  }),
  "FORBIDDEN",
);
await expectCode(call(onboard.detectRuntimeCapabilities, undefined, { context: context(deniedDatabase) }), "FORBIDDEN");
await expectCode(call(onboard.discoverDockerServices, undefined, { context: context(deniedDatabase) }), "FORBIDDEN");
const wrongStep = context(deniedDatabase, anonymous, {
  onboardingClaimToken: "fixture-valid-proof",
  setup: {
    async isClaimOnlyAccessAllowed() {
      return true;
    },
    async currentStep() {
      return "finish";
    },
  },
});
await expectCode(call(onboard.testIntegration, integrationDraft, { context: wrongStep }), "FORBIDDEN");
await expectCode(
  call(onboard.testIntegration, integrationDraft, {
    context: context(deniedDatabase, admin, { demo: { enabled: true, readOnly: true } }),
  }),
  "FORBIDDEN",
);
assert.equal(deniedDatabaseTouches, 0);
assert.equal(externalCalls, 0);

const dialect = new SQLiteSyncDialect();
const params = (where: SQL | undefined) => (where ? dialect.sqlToQuery(where).params : []);
const settingRows = [
  {
    settingKey: "culture",
    value: settingsCodec.stringify({
      defaultLocale: "fr",
      __onboarding_claim: "fixture-hidden",
      apiKey: "fixture-hidden",
    }),
  },
  {
    settingKey: "branding",
    value: settingsCodec.stringify({
      ...defaultServerSettings.branding,
      appName: "Fixture Instance",
      showCustomAppNameOnLogin: false,
      authBranding: undefined,
      __onboarding_claim: "fixture-hidden",
    }),
  },
  { settingKey: "__onboarding_claim", value: "fixture-hidden" },
  { settingKey: "deploymentKey", value: "fixture-hidden" },
  {
    settingKey: "board",
    value: settingsCodec.stringify({
      ...defaultServerSettings.board,
      homeBoardId: "instance",
      mobileHomeBoardId: "instance-mobile",
    }),
  },
];
const countQueries: { table: string; where?: SQL }[] = [];
let userHomes: { id: string; homeBoardId: string | null; mobileHomeBoardId: string | null } = {
  id: "fixture-member",
  homeBoardId: null,
  mobileHomeBoardId: null,
};
let memberships = [
  {
    groupId: "second",
    group: {
      id: "second",
      name: "Second",
      position: 2,
      homeBoardId: "second-board",
      mobileHomeBoardId: null as string | null,
      boardPermissions: [{ boardId: "second-board" }],
    },
  },
  {
    groupId: "first",
    group: {
      id: "first",
      name: "First",
      position: 1,
      homeBoardId: "first-board" as string | null,
      mobileHomeBoardId: null as string | null,
      boardPermissions: [{ boardId: "first-board" }],
    },
  },
];
let publicTarget = false;
let allowGroupTarget = true;
const databaseFixture = {
  query: {
    serverSettings: {
      async findFirst(options: { where: SQL }) {
        return settingRows.find(({ settingKey }) => settingKey === params(options.where)[0]);
      },
      async findMany() {
        return settingRows;
      },
    },
    onboarding: {
      async findFirst() {
        return { step: "integrations", previousStep: "settings", claim: "fixture-hidden" };
      },
    },
    users: {
      async findFirst() {
        return userHomes;
      },
    },
    groupMembers: {
      async findMany() {
        return memberships;
      },
    },
    groups: {
      async findFirst() {
        return { name: everyoneGroup, homeBoardId: "everyone", mobileHomeBoardId: "everyone-mobile" };
      },
    },
    boardUserPermissions: {
      async findMany() {
        return [{ boardId: "user-board" }];
      },
    },
    boards: {
      async findFirst(options: { where: SQL }) {
        const id = params(options.where)[0];
        return {
          id,
          name: `Renamed ${id}`,
          isPublic: publicTarget,
          creatorId: "other",
          userPermissions: [{ userId: "foreign", permission: "full" }],
          groupPermissions: allowGroupTarget ? [{ groupId: "first", permission: "view" }] : [],
        };
      },
    },
    integrations: {
      async findMany() {
        return [
          {
            id: "delegated-full",
            userPermissions: [{ userId: "fixture-member", permission: "full" }],
            groupPermissions: [],
          },
          { id: "foreign-full", userPermissions: [{ userId: "other", permission: "full" }], groupPermissions: [] },
        ];
      },
    },
  },
  async $count(table: Table, where?: SQL) {
    countQueries.push({ table: getTableName(table), where });
    return 19;
  },
} as unknown as Database;
assert.deepEqual(await call(serverSettings.getCulture, undefined, { context: context(databaseFixture) }), {
  defaultLocale: "fr",
});
const branding = await call(serverSettings.getBranding, undefined, { context: context(databaseFixture) });
assert.equal(branding.appName, "Fixture Instance");
assert.equal(branding.authBranding.showAppName, false);
assert.equal(JSON.stringify(branding).includes("fixture-hidden"), false);
const allSettings = await call(serverSettings.getAll, undefined, { context: context(databaseFixture, admin) });
assert.deepEqual(Object.keys(allSettings).toSorted(), [...defaultServerSettingsKeys].toSorted());
assert.equal("__onboarding_claim" in allSettings, false);
assert.equal("deploymentKey" in allSettings, false);
assert.deepEqual(await call(onboard.currentStep, undefined, { context: context(databaseFixture) }), {
  current: "setup",
  previous: "setup",
});

const authorizedSetup = context(deniedDatabase, anonymous, {
  onboardingClaimToken: "fixture-valid-proof",
  setup: {
    async isClaimOnlyAccessAllowed(db, token) {
      assert.equal(db, deniedDatabase);
      return token === "fixture-valid-proof";
    },
    async currentStep() {
      return "setup";
    },
  },
});
await expectCode(call(serverSettings.getAll, undefined, { context: authorizedSetup }), "UNAUTHORIZED");
assert.deepEqual(await call(onboard.testIntegration, integrationDraft, { context: authorizedSetup }), {
  success: false,
});
assert.match(testedIntegration?.id ?? "", /^onboarding_integration_[0-9a-f]{32}$/u);
assert.deepEqual(testedIntegration?.decryptedSecrets, integrationDraft.secrets);
assert.deepEqual(await call(onboard.detectRuntimeCapabilities, undefined, { context: authorizedSetup }), {
  kubernetes: { status: "disabled" },
  workshop: { status: "available" },
});
assert.deepEqual(await call(onboard.discoverDockerServices, undefined, { context: authorizedSetup }), {
  status: "unavailable",
  hosts: [],
  integrations: [],
  apps: [],
});
assert.equal(externalCalls, 3);
assert.equal(deniedDatabaseTouches, 0);

const guestStats = await call(home.getStats, undefined, { context: context(databaseFixture) });
assert.deepEqual(
  guestStats.map(({ titleKey }) => titleKey),
  ["board"],
);
assert.deepEqual(params(countQueries[0]?.where), [1, ""]);
countQueries.length = 0;
const memberStats = await call(home.getStats, undefined, { context: context(databaseFixture, member) });
assert.deepEqual(
  memberStats.map(({ titleKey, count }) => ({ titleKey, count })),
  [
    { titleKey: "board", count: 19 },
    { titleKey: "integration", count: 1 },
  ],
);
assert.deepEqual(params(countQueries[0]?.where), [1, "fixture-member", "user-board", "second-board", "first-board"]);
assert.equal(
  countQueries.some(({ table }) => table === getTableName(tables.users) || table === getTableName(tables.invites)),
  false,
);

const mobileMember = context(databaseFixture, member, { deviceType: "mobile" });
assert.deepEqual(await resolveHomeTarget(mobileMember), { id: "everyone-mobile", name: "Renamed everyone-mobile" });
const secondMembership = memberships[0];
const firstMembership = memberships[1];
assert(secondMembership && firstMembership);
secondMembership.group.mobileHomeBoardId = "second-mobile";
assert.equal((await resolveHomeTarget(mobileMember)).id, "second-mobile");
firstMembership.group.mobileHomeBoardId = "first-mobile";
assert.equal((await resolveHomeTarget(mobileMember)).id, "first-mobile");
firstMembership.group.homeBoardId = null;
assert.equal((await resolveHomeTarget(mobileMember)).id, "second-mobile");
firstMembership.group.homeBoardId = "first-board";
firstMembership.group.mobileHomeBoardId = "";
assert.equal((await resolveHomeTarget(mobileMember)).id, "first-board");
firstMembership.group.homeBoardId = "";
assert.equal((await resolveHomeTarget(mobileMember)).id, "everyone-mobile");
firstMembership.group.homeBoardId = "first-board";
userHomes = { ...userHomes, homeBoardId: "user-desktop" };
assert.equal((await resolveHomeTarget(mobileMember)).id, "user-desktop");
userHomes = { ...userHomes, mobileHomeBoardId: "user-mobile" };
assert.equal((await resolveHomeTarget(mobileMember)).id, "user-mobile");
allowGroupTarget = false;
await expectCode(resolveHomeTarget(mobileMember), "NOT_FOUND");
publicTarget = true;
assert.equal((await resolveHomeTarget(context(databaseFixture))).id, "instance");
assert.equal(
  (await resolveHomeTarget(context(databaseFixture, anonymous, { deviceType: "mobile" }))).id,
  "instance-mobile",
);
const boardDefaultsRow = settingRows.find(({ settingKey }) => settingKey === "board");
assert(boardDefaultsRow);
boardDefaultsRow.value = settingsCodec.stringify({
  ...defaultServerSettings.board,
  homeBoardId: "instance",
  mobileHomeBoardId: "",
});
await expectCode(resolveHomeTarget(context(databaseFixture, anonymous, { deviceType: "mobile" })), "NOT_FOUND");
boardDefaultsRow.value = settingsCodec.stringify({
  ...defaultServerSettings.board,
  homeBoardId: "instance",
  mobileHomeBoardId: null,
});
assert.equal((await resolveHomeTarget(context(databaseFixture, anonymous, { deviceType: "mobile" }))).id, "instance");
userHomes = { ...userHomes, homeBoardId: null, mobileHomeBoardId: null };
memberships = [];
assert.equal((await resolveHomeTarget(mobileMember)).id, "everyone-mobile");
publicTarget = false;
await expectCode(resolveHomeTarget(context(databaseFixture)), "NOT_FOUND");
console.log(
  JSON.stringify(
    {
      allocated: allocated.length,
      nativeUnmounted: implemented.length,
      pending,
      deniedDatabaseTouches,
      realExternalCalls: 0,
      syntheticEffects: externalCalls,
      publicSecretProjection: "passed",
      trustedSetupDenial: "passed",
      homeAuthorityAndPrecedence: "passed",
    },
    null,
    2,
  ),
);
