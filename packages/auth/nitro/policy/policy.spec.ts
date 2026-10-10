import assert from "node:assert/strict";
import { test } from "node:test";

import { getPermissionsWithChildren, matrixStateToPermissions, permissionsToMatrixState } from "@homarr/definitions";

import {
  AuthorizationError,
  assertAuthorized,
  authorizeBoard,
  authorizeIntegrations,
  authorizeSelfOrAdmin,
  authorizeSetup,
  constructBoardPermissions,
  constructIntegrationPermissions,
  enforceDemoAccountMutation,
  enforceMutationMode,
  hasSameSecretBinding,
  requireGlobalPermission,
  resolveEffectivePermissions,
} from "./index";
import type {
  BoardAccessEvidence,
  IntegrationAccessEvidence,
  PolicyIdentity,
  ResourceAuthorizationRepository,
} from "./index";

const anonymous: PolicyIdentity = { type: "anonymous" };
const sameAuthentication = (left: string, right: string) => left === right;
const member: PolicyIdentity = { type: "authenticated", userId: "member", groupIds: ["members"], permissions: [] };
const admin: PolicyIdentity = {
  type: "authenticated",
  userId: "admin",
  groupIds: [],
  permissions: resolveEffectivePermissions({ getPermissionsWithChildren }, ["admin"]),
};
const board: BoardAccessEvidence = {
  id: "board",
  creatorId: "owner",
  isPublic: false,
  userPermissions: [{ userId: "other", permission: "full" }],
  groupPermissions: [{ groupId: "foreign", permission: "full" }],
};
const integration: IntegrationAccessEvidence = {
  id: "integration",
  kind: "piHole",
  items: [{ item: { boardId: board.id } }],
  userPermissions: [{ userId: "other", permission: "full" }],
  groupPermissions: [{ groupId: "foreign", permission: "full" }],
};

function repository(
  boards: readonly BoardAccessEvidence[] = [board],
  integrations: readonly IntegrationAccessEvidence[] = [integration],
): ResourceAuthorizationRepository {
  return {
    findBoard: async (_identity, id) => boards.find((row) => row.id === id) ?? null,
    findBoards: async (_identity, ids) => boards.filter(({ id }) => ids.includes(id)),
    findIntegrations: async (_identity, ids, kinds) =>
      integrations.filter(({ id, kind }) => ids.includes(id) && kinds.includes(kind)),
  };
}

test("source inheritance and matrix keep independently selected app use separate", () => {
  const modify = resolveEffectivePermissions({ getPermissionsWithChildren }, ["app-modify-all"]);
  assert.deepEqual(modify.toSorted(), ["app-create", "app-modify-all"]);
  assert.equal(modify.includes("app-use-all"), false);
  assert.equal(admin.type === "authenticated" && admin.permissions.includes("integration-use-all"), true);
  const selected = ["app-modify-all", "app-use-all"] satisfies Parameters<typeof permissionsToMatrixState>[0];
  const matrix = permissionsToMatrixState(selected);
  assert.deepEqual(permissionsToMatrixState(matrixStateToPermissions(matrix)), matrix);
});

test("principal-scoped board grants preserve source booleans and masked denial", async () => {
  for (const identity of [anonymous, member]) {
    assert.deepEqual(await authorizeBoard(repository(), identity, board.id, "view"), {
      type: "deny",
      reason: "not-found",
    });
    assert.deepEqual(await authorizeBoard(repository(), identity, "missing", "view"), {
      type: "deny",
      reason: "not-found",
    });
  }
  const publicBoard = { ...board, isPublic: true };
  assert.deepEqual(await authorizeBoard(repository([publicBoard]), anonymous, board.id, "view"), { type: "allow" });
  assert.deepEqual(await authorizeBoard(repository([publicBoard]), anonymous, board.id, "modify"), {
    type: "deny",
    reason: "not-found",
  });
  const ownGrant = {
    ...board,
    groupPermissions: [{ groupId: "members", permission: "modify" }],
  } satisfies BoardAccessEvidence;
  assert.deepEqual(constructBoardPermissions(ownGrant, member), {
    hasFullAccess: false,
    hasChangeAccess: true,
    hasViewAccess: true,
  });
  assert.deepEqual(await authorizeBoard(repository(), admin, board.id, "full"), { type: "allow" });
  assert.deepEqual(await authorizeBoard(repository(), { ...member, userId: "owner" }, board.id, "full"), {
    type: "allow",
  });
});

test("public board allows native query but never use, interact or full", async () => {
  const repo = repository([{ ...board, isPublic: true }]);
  const selection = { cardinality: "one", integrationId: integration.id } as const;
  assert.equal((await authorizeIntegrations(repo, anonymous, selection, "query", ["piHole"])).type, "allow");
  assert.deepEqual(await authorizeIntegrations(repo, anonymous, selection, "interact", ["piHole"]), {
    type: "deny",
    reason: "forbidden",
  });
  for (const action of ["use", "full"] as const) {
    assert.deepEqual(await authorizeIntegrations(repo, anonymous, selection, action, ["piHole"]), {
      type: "deny",
      reason: "not-found",
    });
  }
  assert.deepEqual(await authorizeIntegrations(repository(), member, selection, "query", ["piHole"]), {
    type: "deny",
    reason: "forbidden",
  });
});

test("current integration grants preserve source hierarchy and current board memberships", async () => {
  const ownGrant = {
    ...integration,
    groupPermissions: [{ groupId: "members", permission: "interact" }],
  } satisfies IntegrationAccessEvidence;
  assert.deepEqual(constructIntegrationPermissions(ownGrant, member), {
    hasFullAccess: false,
    hasInteractAccess: true,
    hasUseAccess: true,
  });
  const selection = { cardinality: "one", integrationId: integration.id } as const;
  const visible = {
    ...board,
    groupPermissions: [{ groupId: "members", permission: "view" }],
  } satisfies BoardAccessEvidence;
  assert.equal(
    (await authorizeIntegrations(repository([visible]), member, selection, "query", ["piHole"])).type,
    "allow",
  );
  assert.deepEqual(await authorizeIntegrations(repository([visible]), anonymous, selection, "query", ["piHole"]), {
    type: "deny",
    reason: "forbidden",
  });
  const allBoards = { ...member, permissions: ["board-view-all"] } satisfies PolicyIdentity;
  assert.equal((await authorizeIntegrations(repository(), allBoards, selection, "query", ["piHole"])).type, "allow");
  const detached = { ...integration, items: [] };
  assert.deepEqual(await authorizeIntegrations(repository([], [detached]), allBoards, selection, "query", ["piHole"]), {
    type: "deny",
    reason: "forbidden",
  });
});

test("all selections must exist and match kinds before any authorization succeeds", async () => {
  const repo = repository();
  for (const selection of [
    { cardinality: "one", integrationId: "missing" },
    { cardinality: "many", integrationIds: [integration.id, "missing"] },
    { cardinality: "many", integrationIds: [integration.id, integration.id] },
  ] satisfies Parameters<typeof authorizeIntegrations>[2][]) {
    assert.deepEqual(await authorizeIntegrations(repo, admin, selection, "query", ["piHole"]), {
      type: "deny",
      reason: "not-found",
    });
  }
  assert.deepEqual(
    await authorizeIntegrations(repo, admin, { cardinality: "one", integrationId: integration.id }, "query", [
      "homeAssistant",
    ]),
    { type: "deny", reason: "not-found" },
  );
  assert.equal(
    (
      await authorizeIntegrations(
        repo,
        admin,
        { cardinality: "many", integrationIds: [integration.id, integration.id] },
        "full",
        ["piHole"],
      )
    ).type,
    "allow",
  );
  assert.deepEqual(
    await authorizeIntegrations(repo, anonymous, { cardinality: "many", integrationIds: [] }, "query", ["piHole"]),
    { type: "allow", integrations: [] },
  );
});

test("admin never bypasses setup step or demo and claims never grant ordinary admin", () => {
  const setup = { hasUsers: false, claim: "valid", currentStep: "user" } as const;
  assert.deepEqual(authorizeSetup(anonymous, setup, "user"), { type: "allow" });
  assert.deepEqual(requireGlobalPermission(anonymous, "admin"), { type: "deny", reason: "unauthenticated" });
  assert.deepEqual(authorizeSetup(member, { ...setup, hasUsers: true }, "user"), {
    type: "deny",
    reason: "invalid-claim",
  });
  assert.deepEqual(authorizeSetup(admin, setup, "finish"), { type: "deny", reason: "wrong-step" });
  assert.deepEqual(enforceMutationMode({ demoMode: true, demoReadOnly: true }, "mutation"), {
    type: "deny",
    reason: "demo-read-only",
  });
  assert.deepEqual(enforceMutationMode({ demoMode: true, demoReadOnly: false }, "mutation"), { type: "allow" });
  assert.deepEqual(enforceDemoAccountMutation({ demoMode: true, demoReadOnly: false }, "password"), {
    type: "deny",
    reason: "demo-read-only",
  });
  assert.deepEqual(
    enforceDemoAccountMutation(
      { demoMode: true, demoReadOnly: false },
      { type: "profile", currentName: "unchanged", nextName: "unchanged" },
    ),
    { type: "allow" },
  );
  assert.deepEqual(authorizeSelfOrAdmin(member, "other", "not-found"), { type: "deny", reason: "not-found" });
  assert.deepEqual(authorizeSelfOrAdmin(admin, "other"), { type: "allow" });
  assert.throws(() => assertAuthorized(requireGlobalPermission(member, "admin")), AuthorizationError);
});

test("origin, network and authentication are the complete Custom JSX retention boundary", () => {
  const source = {
    type: "http",
    baseUrl: "https://service.example/a",
    networkScope: "local",
    authentication: "header:Authorization",
  } as const;
  assert.equal(
    hasSameSecretBinding(source, { ...source, baseUrl: "https://service.example/b" }, sameAuthentication),
    true,
  );
  assert.equal(
    hasSameSecretBinding(source, { ...source, baseUrl: "https://other.example/a" }, sameAuthentication),
    false,
  );
  assert.equal(hasSameSecretBinding(source, { ...source, networkScope: "public" }, sameAuthentication), false);
  assert.equal(hasSameSecretBinding(source, { ...source, authentication: "query:key" }, sameAuthentication), false);
  assert.equal(hasSameSecretBinding({ type: "integration" }, source, sameAuthentication), false);
});
