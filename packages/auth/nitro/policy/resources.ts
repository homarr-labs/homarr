import type { BoardPermission, IntegrationPermission } from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions/integration";

import { hasGlobalPermission, snapshotPolicyIdentity } from "./identity";
import type { AuthorizationDecision, PolicyIdentity } from "./identity";

export interface ResourceGrants<TPermission> {
  readonly userPermissions: readonly { readonly userId: string; readonly permission: TPermission }[];
  readonly groupPermissions: readonly { readonly groupId: string; readonly permission: TPermission }[];
}

export interface BoardAccessEvidence extends ResourceGrants<BoardPermission> {
  readonly id: string;
  readonly creatorId: string | null;
  readonly isPublic: boolean;
}

export interface IntegrationAccessEvidence extends ResourceGrants<IntegrationPermission> {
  readonly id: string;
  readonly kind: IntegrationKind;
  readonly items: readonly { readonly item: { readonly boardId: string } }[];
}

export interface ResourceAuthorizationRepository<
  TIntegration extends IntegrationAccessEvidence = IntegrationAccessEvidence,
> {
  findBoard(identity: PolicyIdentity, id: string): Promise<BoardAccessEvidence | null>;
  findBoards(identity: PolicyIdentity, ids: readonly string[]): Promise<readonly BoardAccessEvidence[]>;
  findIntegrations(
    identity: PolicyIdentity,
    ids: readonly string[],
    allowedKinds: readonly IntegrationKind[],
  ): Promise<readonly TIntegration[]>;
}

function principalGrants<TPermission>(identity: PolicyIdentity, evidence: ResourceGrants<TPermission>): TPermission[] {
  if (identity.type === "anonymous") return [];
  return evidence.userPermissions
    .filter(({ userId }) => userId === identity.userId)
    .map(({ permission }) => permission)
    .concat(
      evidence.groupPermissions
        .filter(({ groupId }) => identity.groupIds.includes(groupId))
        .map(({ permission }) => permission),
    );
}

export function constructBoardPermissions(board: BoardAccessEvidence, identity: PolicyIdentity) {
  const isCreator = identity.type === "authenticated" && identity.userId === board.creatorId;
  const permissions = principalGrants(identity, board);
  return {
    hasFullAccess: isCreator || permissions.includes("full") || hasGlobalPermission(identity, "board-full-all"),
    hasChangeAccess:
      isCreator ||
      permissions.includes("modify") ||
      permissions.includes("full") ||
      hasGlobalPermission(identity, "board-modify-all") ||
      hasGlobalPermission(identity, "board-full-all"),
    hasViewAccess:
      isCreator || permissions.length >= 1 || board.isPublic || hasGlobalPermission(identity, "board-view-all"),
  };
}

export function constructIntegrationPermissions(
  integration: ResourceGrants<IntegrationPermission>,
  identity: PolicyIdentity,
) {
  const permissions = principalGrants(identity, integration);
  const hasGlobalFullAccess = hasGlobalPermission(identity, "integration-full-all");
  const hasGlobalInteractAccess = hasGlobalFullAccess || hasGlobalPermission(identity, "integration-interact-all");
  const hasGlobalUseAccess = hasGlobalInteractAccess || hasGlobalPermission(identity, "integration-use-all");
  return {
    hasFullAccess: hasGlobalFullAccess || permissions.includes("full"),
    hasInteractAccess: hasGlobalInteractAccess || permissions.includes("full") || permissions.includes("interact"),
    hasUseAccess: hasGlobalUseAccess || permissions.length >= 1,
  };
}

export function decideBoardAccess(
  identity: PolicyIdentity,
  board: BoardAccessEvidence | null,
  permission: BoardPermission,
): AuthorizationDecision {
  if (!board) return { type: "deny", reason: "not-found" };
  const access = constructBoardPermissions(board, identity);
  if (
    access.hasFullAccess ||
    (permission !== "full" && access.hasChangeAccess) ||
    (permission === "view" && access.hasViewAccess)
  ) {
    return { type: "allow" };
  }
  return { type: "deny", reason: "not-found" };
}

export async function authorizeBoard(
  repository: ResourceAuthorizationRepository,
  identity: PolicyIdentity,
  id: string,
  permission: BoardPermission,
): Promise<AuthorizationDecision> {
  const principal = snapshotPolicyIdentity(identity);
  const board = await repository.findBoard(principal, id);
  return decideBoardAccess(principal, board?.id === id ? board : null, permission);
}

export async function hasQueryAccessToIntegrationsAsync(
  repository: ResourceAuthorizationRepository,
  identity: PolicyIdentity,
  integrations: readonly IntegrationAccessEvidence[],
) {
  const principal = snapshotPolicyIdentity(identity);
  const withoutUseAccess = integrations.filter((integration) => {
    if (constructIntegrationPermissions(integration, principal).hasUseAccess) return false;
    return !(hasGlobalPermission(principal, "board-view-all") && integration.items.length >= 1);
  });
  if (withoutUseAccess.length === 0) return true;
  const boardIds = [...new Set(withoutUseAccess.flatMap(({ items }) => items.map(({ item }) => item.boardId)))];
  const boards = await repository.findBoards(principal, boardIds);
  const visibleIds = new Set(
    boards
      .filter((board) => boardIds.includes(board.id) && decideBoardAccess(principal, board, "view").type === "allow")
      .map(({ id }) => id),
  );
  return withoutUseAccess.every(({ items }) => items.some(({ item }) => visibleIds.has(item.boardId)));
}

export type IntegrationAction = "query" | IntegrationPermission;

export type IntegrationSelection =
  | { readonly cardinality: "one"; readonly integrationId: string }
  | { readonly cardinality: "many"; readonly integrationIds: readonly string[] };

export type IntegrationAuthorization<TIntegration extends IntegrationAccessEvidence = IntegrationAccessEvidence> =
  | { readonly type: "deny"; readonly reason: "not-found" | "forbidden" }
  | { readonly type: "allow"; readonly integrations: readonly TIntegration[] };

export async function authorizeIntegrations<TIntegration extends IntegrationAccessEvidence>(
  repository: ResourceAuthorizationRepository<TIntegration>,
  identity: PolicyIdentity,
  selection: IntegrationSelection,
  action: IntegrationAction,
  allowedKinds: readonly IntegrationKind[],
  surface: "native" | "management" = action === "full" || action === "use" ? "management" : "native",
): Promise<IntegrationAuthorization<TIntegration>> {
  const principal = snapshotPolicyIdentity(identity);
  const kinds = Object.freeze([...allowedKinds]);
  const ids = selection.cardinality === "one" ? [selection.integrationId] : [...selection.integrationIds];
  const native = surface === "native";
  const requestedIds = Object.freeze(native ? ids : [...new Set(ids)]);
  if (requestedIds.length === 0) return { type: "allow", integrations: [] };
  const integrations = await repository.findIntegrations(principal, requestedIds, kinds);
  if (
    integrations.length !== requestedIds.length ||
    new Set(integrations.map(({ id }) => id)).size !== requestedIds.length ||
    integrations.some(({ id, kind }) => !requestedIds.includes(id) || !kinds.includes(kind))
  ) {
    return { type: "deny", reason: "not-found" };
  }
  const allowed =
    action === "query"
      ? await hasQueryAccessToIntegrationsAsync(repository, principal, integrations)
      : integrations.every((integration) => {
          const access = constructIntegrationPermissions(integration, principal);
          return action === "full"
            ? access.hasFullAccess
            : action === "interact"
              ? access.hasInteractAccess
              : access.hasUseAccess;
        });
  if (!allowed) return { type: "deny", reason: native ? "forbidden" : "not-found" };
  return { type: "allow", integrations };
}
