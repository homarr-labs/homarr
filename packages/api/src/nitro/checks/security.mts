import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { call, ORPCError } from "@orpc/server";

import type { Database } from "@homarr/db";

import { backendContractRevision } from "../context";
import type { BackendContext, BackendPrincipal, BackendResponseEffect } from "../context";
import { createBackendFetchContribution, createBackendServerClient, defineBackendContribution } from "../contribution";
import { directPortModules, directPortPaths, getSourcePortStatus, sourcePortRows } from "../port-map";
import type { SourceLeafPath } from "../port-map";
import { portedApiKeyPaths } from "../routers/api-keys";
import { appImplementedPaths } from "../routers/app";
import { homeImplementedPaths } from "../routers/home";
import { portedInvitePaths } from "../routers/invite";
import { onboardImplementedPaths } from "../routers/onboard";
import { searchEngineImplementedPaths } from "../routers/search-engine";
import { serverSettingsImplementedPaths } from "../routers/server-settings";
import { portedUserPaths } from "../routers/user";
import { createGroupProcedures, portedGroupPaths } from "../routers/group";
import type { GroupProcedureResources } from "../routers/group";
import { createInfoProcedures } from "../routers/info";

let databaseTouches = 0;
const deniedDatabase = new Proxy({} as Database, {
  get() {
    databaseTouches++;
    throw new Error("Denied operations must not access persistence");
  },
});
const effects: BackendResponseEffect[] = [];
const principal: BackendPrincipal = {
  kind: "authenticated",
  user: { id: "disposable-policy-check", permissions: [], colorScheme: "dark", name: null, email: null, image: null },
};
const admin: BackendPrincipal = { kind: "authenticated", user: { ...principal.user, permissions: ["admin"] } };
const request = new Request("https://disposable.invalid/rpc/info/getInfo", { method: "POST" });
function makeContext(overrides: Partial<Omit<BackendContext, "db">> = {}): BackendContext {
  return {
    request,
    signal: request.signal,
    principal,
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
    effect(effect) {
      effects.push(effect);
    },
    onDispose() {},
    ...overrides,
    db: deniedDatabase,
  };
}
const context = makeContext();
const resources: GroupProcedureResources = {
  get groups(): GroupProcedureResources["groups"] {
    throw new Error("Denied operations must not access tables");
  },
  operators: {
    eq() {
      throw new Error("Denied operations must not build SQL");
    },
    and() {
      throw new Error("Denied operations must not build SQL");
    },
    like() {
      throw new Error("Denied operations must not build SQL");
    },
    not() {
      throw new Error("Denied operations must not build SQL");
    },
  },
};
const group = createGroupProcedures(resources);
const info = createInfoProcedures("disposable-version");
const fixtureLeaves = [
  "group.getAll",
  "group.selectable",
  "group.updateGroup",
  "info.getInfo",
  "info.isDemoMode",
  "info.isDemoReadOnly",
] as const satisfies readonly SourceLeafPath[];
assert.throws(
  () =>
    defineBackendContribution({
      revision: backendContractRevision,
      id: "disposable-renamed-source-check",
      router: { info: { renamed: info.getInfo } },
      leaves: ["info.getInfo"],
    }),
  /Source procedure route does not match its declared identity/,
);
const contribution = defineBackendContribution({
  revision: backendContractRevision,
  id: "disposable-security-check",
  router: { group, info },
  leaves: fixtureLeaves,
});

async function expectCode(operation: Promise<unknown>, code: string) {
  await assert.rejects(operation, (error: unknown) => error instanceof ORPCError && error.code === code);
}

await expectCode(call(group.getAll, undefined, { context }), "FORBIDDEN");
await expectCode(
  call(group.getAll, undefined, { context: makeContext({ principal: { kind: "anonymous" } }) }),
  "UNAUTHORIZED",
);
await expectCode(call(group.updateGroup, { id: "unread", name: "renamed" }, { context }), "FORBIDDEN");
await expectCode(
  call(
    group.updateGroup,
    { id: "unread", name: "renamed" },
    {
      context: makeContext({ principal: admin, demo: { enabled: true, readOnly: true } }),
    },
  ),
  "FORBIDDEN",
);
assert.equal(databaseTouches, 0);

const direct = createBackendServerClient(contribution, context);
assert.deepEqual(await direct.info.getInfo(undefined), { version: "disposable-version" });
await expectCode(
  call(info.getInfo, undefined, { context: makeContext({ principal: { kind: "anonymous" } }) }),
  "UNAUTHORIZED",
);

let resolutions = 0;
const fetchContribution = createBackendFetchContribution({
  contribution,
  path: "/rpc",
  async resolveContext(requestResources) {
    resolutions++;
    return makeContext(requestResources);
  },
});
const client: typeof direct = createORPCClient(
  new RPCLink({
    origin: "https://disposable.invalid",
    url: "/rpc",
    async fetch(rpcRequest, init) {
      const incoming = new Request(rpcRequest, init);
      const result = await fetchContribution.handle({
        request: incoming,
        signal: incoming.signal,
        effect: context.effect,
        onDispose: context.onDispose,
      });
      return result.response;
    },
  }),
);
assert.deepEqual(await client.info.getInfo(undefined), { version: "disposable-version" });
assert.equal(resolutions, 1);
await expectCode(client.group.updateGroup({ id: "unread", name: "renamed" }), "FORBIDDEN");
assert.equal(databaseTouches, 0);

const invalid = await fetchContribution.handle(
  makeContext({
    request: new Request("https://disposable.invalid/rpc/missing", { method: "POST" }),
  }),
);
assert.equal(invalid.response.status, 404);
const method = await fetchContribution.handle(
  makeContext({
    request: new Request("https://disposable.invalid/rpc/info/getInfo"),
  }),
);
assert.equal(method.response.status, 405);

context.effect({ kind: "cookie", value: "first=one; Path=/; HttpOnly" });
context.effect({ kind: "cookie", value: "second=two; Path=/; HttpOnly" });
assert.equal(effects.length, 2);
const headers = new Headers();
for (const effect of effects) {
  if (effect.kind === "cookie") headers.append("Set-Cookie", effect.value);
}
assert.deepEqual(
  new Response(null, { headers }).headers.getSetCookie(),
  effects.map((effect) => (effect.kind === "cookie" ? effect.value : "")),
);

const ledger = await readFile(
  new URL("../../../../../.scratch/nitro-full-migration/COVERAGE-LEDGER.md", import.meta.url),
  "utf8",
);
const rows = [...ledger.matchAll(/^\| ([\w.]+)\s+\| ([QMS])\s+\| #(\d+)\s+\| (R\d+|-)\s+\| ([\w.-]+)\s+\|/gm)].map(
  (match) => match.slice(1),
);
assert.deepEqual(sourcePortRows, rows);
assert.equal(new Set(sourcePortRows.map(([leaf]) => leaf)).size, 334);
assert.equal(sourcePortRows.filter(([, , , rest]) => rest !== "-").length, 52);
assert.equal(sourcePortRows.filter(([, , , , mcp]) => mcp !== "-").length, 133);
async function readFrozenImplementedPaths(moduleName: string, exportName: string) {
  const source = await readFile(new URL(`../routers/${moduleName}.ts`, import.meta.url), "utf8");
  const declaration = source.match(new RegExp(`export const ${exportName} = \\[([\\s\\S]*?)\\]`));
  assert.ok(declaration?.[1], `Missing frozen literal path list: ${moduleName}.${exportName}`);
  const literals = /"([\w.]+)"/g;
  assert.match(
    declaration[1].replace(literals, ""),
    /^[\s,]*$/,
    "Frozen path list must contain only literal identities",
  );
  return [...declaration[1].matchAll(literals)].map((match) => match[1]);
}
const [integrationPaths, iconPaths, mediaPaths, certificatePaths] = await Promise.all([
  readFrozenImplementedPaths("integration", "portedIntegrationManagementPaths"),
  readFrozenImplementedPaths("icon", "iconImplementedPaths"),
  readFrozenImplementedPaths("media", "mediaImplementedPaths"),
  readFrozenImplementedPaths("certificates", "certificateImplementedPaths"),
]);
const acceptedModules = [
  {
    module: "packages/api/src/nitro/routers/info.ts",
    leaves: fixtureLeaves.filter((path) => path.startsWith("info.")),
  },
  { module: "packages/api/src/nitro/routers/user.ts", leaves: portedUserPaths },
  { module: "packages/api/src/nitro/routers/group.ts", leaves: portedGroupPaths },
  { module: "packages/api/src/nitro/routers/invite.ts", leaves: portedInvitePaths },
  { module: "packages/api/src/nitro/routers/api-keys.ts", leaves: portedApiKeyPaths },
  { module: "packages/api/src/nitro/routers/server-settings.ts", leaves: serverSettingsImplementedPaths },
  { module: "packages/api/src/nitro/routers/onboard.ts", leaves: onboardImplementedPaths },
  { module: "packages/api/src/nitro/routers/home.ts", leaves: homeImplementedPaths },
  { module: "packages/api/src/nitro/routers/app.ts", leaves: appImplementedPaths },
  { module: "packages/api/src/nitro/routers/search-engine.ts", leaves: searchEngineImplementedPaths },
  { module: "packages/api/src/nitro/routers/integration.ts", leaves: integrationPaths },
  { module: "packages/api/src/nitro/routers/icon.ts", leaves: iconPaths },
  { module: "packages/api/src/nitro/routers/media.ts", leaves: mediaPaths },
  { module: "packages/api/src/nitro/routers/certificates.ts", leaves: certificatePaths },
];
assert.deepEqual(directPortModules, acceptedModules);
assert.equal(directPortPaths.length, 91);
assert.equal(new Set(directPortPaths).size, 91);
assert.equal(fixtureLeaves.length, 6);
let pendingLeaves = 0;
for (const [path] of sourcePortRows) {
  const status = getSourcePortStatus(path);
  const accepted = acceptedModules.find(({ leaves }) => leaves.some((leaf) => leaf === path));
  if (accepted) {
    assert.equal(status.kind, "direct-unmounted");
    assert.ok(status.kind === "direct-unmounted");
    assert.equal(status.module, accepted.module);
  } else {
    assert.equal(status.kind, "pending");
    pendingLeaves++;
  }
}
assert.equal(pendingLeaves, 243);
console.log(
  JSON.stringify({
    revision: backendContractRevision,
    nativeUnmountedLeaves: directPortPaths.length,
    uniqueNativeUnmountedLeaves: new Set(directPortPaths).size,
    instantiatedFixtureLeaves: fixtureLeaves.length,
    pendingLeaves,
    conservedLeaves: sourcePortRows.length,
    restCandidates: 52,
    mcpCandidates: 133,
    databaseTouches,
    externalCalls: 0,
  }),
);
