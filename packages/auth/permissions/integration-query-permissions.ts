import type { Session } from "next-auth";

import { splitToChunksWithNItems } from "@homarr/common";
import type { Database } from "@homarr/db";
import { and, eq, inArray, or } from "@homarr/db";
import { boardGroupPermissions, boards, boardUserPermissions, groupMembers } from "@homarr/db/schema";
import type { IntegrationPermission } from "@homarr/definitions";

import { constructIntegrationPermissions } from "./integration-permissions";

interface Integration {
  id: string;
  items: {
    item: {
      boardId: string;
    };
  }[];
  userPermissions: {
    permission: IntegrationPermission;
  }[];
  groupPermissions: {
    permission: IntegrationPermission;
  }[];
}

export const hasQueryAccessToIntegrationsAsync = async (
  db: Database,
  integrations: Integration[],
  session: Session | null,
) => {
  const accessibleIntegrations = await filterIntegrationsWithQueryAccessAsync(db, integrations, session);
  return accessibleIntegrations.length === integrations.length;
};

export const filterIntegrationsWithQueryAccessAsync = async <TIntegration extends Integration>(
  db: Database,
  integrations: TIntegration[],
  session: Session | null,
): Promise<TIntegration[]> => {
  const canViewAllBoards = session?.user.permissions.includes("board-view-all");
  const integrationsWithDirectAccess = new Set(
    integrations.filter(
      (integration) =>
        (canViewAllBoards && integration.items.length > 0) ||
        constructIntegrationPermissions(integration, session).hasUseAccess,
    ),
  );
  const relevantBoardIds = [
    ...new Set(
      integrations
        .filter((integration) => !integrationsWithDirectAccess.has(integration))
        .flatMap((integration) => integration.items.map(({ item }) => item.boardId)),
    ),
  ];
  if (relevantBoardIds.length === 0)
    return integrations.filter((integration) => integrationsWithDirectAccess.has(integration));

  const userId = session?.user.id ?? "";
  const accessibleBoardWhere = or(
    eq(boards.isPublic, true),
    eq(boards.creatorId, userId),
    inArray(
      boards.id,
      db
        .select({ boardId: boardUserPermissions.boardId })
        .from(boardUserPermissions)
        .where(eq(boardUserPermissions.userId, userId)),
    ),
    inArray(
      boards.id,
      db
        .select({ boardId: boardGroupPermissions.boardId })
        .from(boardGroupPermissions)
        .where(
          inArray(
            boardGroupPermissions.groupId,
            db.select({ groupId: groupMembers.groupId }).from(groupMembers).where(eq(groupMembers.userId, userId)),
          ),
        ),
    ),
  );
  const accessibleBoardIds = new Set<string>();
  for (const boardIds of splitToChunksWithNItems(relevantBoardIds, 500)) {
    const accessibleBoards = await db.query.boards.findMany({
      columns: { id: true },
      where: and(inArray(boards.id, boardIds), accessibleBoardWhere),
    });
    for (const { id } of accessibleBoards) {
      accessibleBoardIds.add(id);
    }
  }
  return integrations.filter(
    (integration) =>
      integrationsWithDirectAccess.has(integration) ||
      integration.items.some(({ item }) => accessibleBoardIds.has(item.boardId)),
  );
};
