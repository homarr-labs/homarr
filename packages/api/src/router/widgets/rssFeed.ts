import SuperJSON from "superjson";
import { z } from "zod/v4";

import type { Session } from "@homarr/auth";
import type { Database } from "@homarr/db";
import { eq } from "@homarr/db";
import { items, users } from "@homarr/db/schema";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { rssFeedsRequestHandler } from "@homarr/request-handler/rss-feeds";

import type { WidgetComponentProps } from "../../../../widgets/src";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const logger = createLogger({ module: "rssFeed" });

const feedsInput = z.object({
  urls: z.array(z.string()).max(100),
  maximumAmountPosts: z.number(),
});

export const rssFeedRouter = createTRPCRouter({
  getFeeds: publicProcedure.input(feedsInput).query(async ({ ctx, input }) => {
    const urls = (await canAccessAllFeedsAsync(ctx.db, ctx.session))
      ? input.urls
      : await restrictUrlsAsync(ctx.db, input.urls);

    const settled = await Promise.allSettled(
      urls.map(async (url) => {
        const innerHandler = rssFeedsRequestHandler.handler({
          url,
          count: input.maximumAmountPosts,
        });
        return await innerHandler.getDataAsync();
      }),
    );

    return settled
      .flatMap((result, index) => {
        if (result.status === "fulfilled") return result.value.data.entries;
        logger.warn("RSS feed fetch failed", { url: urls[index], error: result.reason });
        return [];
      })
      .toSorted((entryA, entryB) => {
        return entryA.published && entryB.published
          ? new Date(entryB.published).getTime() - new Date(entryA.published).getTime()
          : 0;
      })
      .slice(0, input.maximumAmountPosts);
  }),
});

export async function canAccessAllFeedsAsync(db: Database, session: Session | null) {
  // Unauthenticated users can never access all feeds
  if (!session) return false;
  // Users with those permissions can modify a board and therefore add a rss feed widget with any feed url
  if (session.user.permissions.includes("board-create") || session.user.permissions.includes("board-modify-all")) {
    return true;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    with: {
      boards: {
        columns: { id: true },
      },
      boardPermissions: true,
      groups: {
        with: {
          group: {
            with: { boardPermissions: true },
          },
        },
      },
    },
  });

  // Should never happen as the user is authenticated, but just in case
  if (!user) return false;

  // If user is owner of any board he has full access and can therefore create widgets with any feed url
  if (user.boards.length >= 1) return true;

  // If user has direct permissions on any board that allow modifying it, he can add a rss feed widget with any feed url
  if (user.boardPermissions.some(({ permission }) => permission === "modify" || permission === "full")) {
    return true;
  }

  // If user is in a group that has permissions on any board that allow modifying it, he can add a rss feed widget with any feed url
  if (
    user.groups.some(({ group }) =>
      group.boardPermissions.some(({ permission }) => permission === "modify" || permission === "full"),
    )
  ) {
    return true;
  }

  // Fallback to not allowing access to all feeds
  return false;
}

export async function restrictUrlsAsync(db: Database, urls: string[]) {
  const rssFeedItems = await db.query.items.findMany({
    where: eq(items.kind, "rssFeed"),
  });

  const configuredUrls = rssFeedItems
    .map((item) => SuperJSON.parse<WidgetComponentProps<"rssFeed">["options"]>(item.options))
    .flatMap((options) => options.feedUrls);
  return urls.filter((url) => configuredUrls.includes(url));
}
