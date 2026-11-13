import { parse } from "superjson";
import { z } from "zod/v4";

import type { Session } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { and, eq, inArray } from "@homarr/db";
import { boardGroupPermissions, boardUserPermissions, groupMembers, items } from "@homarr/db/schema";
import { FrameleafConnectionError } from "@homarr/integrations/frameleaf";

export async function requireFrameleafWidgetAsync(database: Database, session: Session | null, itemId: string) {
  if (!session?.user.id || !Number.isFinite(Date.parse(session.expires)) || Date.parse(session.expires) <= Date.now())
    throw new FrameleafConnectionError("consent");
  const userId = session.user.id;
  const item = await database.query.items.findFirst({
    where: and(eq(items.id, itemId), eq(items.kind, "frameleaf-albumCarousel")),
    with: {
      board: {
        with: {
          userPermissions: { where: eq(boardUserPermissions.userId, userId) },
          groupPermissions: {
            where: inArray(
              boardGroupPermissions.groupId,
              database
                .select({ groupId: groupMembers.groupId })
                .from(groupMembers)
                .where(eq(groupMembers.userId, userId)),
            ),
          },
        },
      },
      integrations: { with: { integration: true } },
    },
  });
  const board = item?.board;
  // Private photographs require an explicit board audience. Global board administration is insufficient.
  if (
    !board ||
    board.isPublic ||
    !(board.creatorId === userId || board.userPermissions.length || board.groupPermissions.length)
  )
    throw new FrameleafConnectionError("consent");
  if (item.integrations.length !== 1) throw new FrameleafConnectionError("configuration");
  const integration = item.integrations[0]?.integration;
  if (integration?.kind !== "frameleaf") throw new FrameleafConnectionError("configuration");
  const { albumId } = z.object({ albumId: z.uuid() }).parse(parse(item.options));
  return { integrationId: integration.id, albumId, origin: integration.url, boardId: board.id };
}
