import type { Metadata } from "next";
import { Suspense } from "react";
import { TRPCError } from "@trpc/server";

// Placed here because gridstack styles are used for board content
import "~/styles/gridstack.scss";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import superjson from "superjson";
import { queryCacheBuster } from "@homarr/api/query-cache";
import { getQueryClient } from "@homarr/api/server";
import { IntegrationProvider } from "@homarr/auth/client";
import { auth } from "@homarr/auth/next";
import { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";
import { isNullOrWhitespace } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import type { WidgetKind } from "@homarr/definitions";
import { getQueryCacheAsync } from "@homarr/redis";
import { getI18n } from "@homarr/translation/server";
import { prefetchForKindAsync } from "@homarr/widgets/prefetch";

import { createMetaTitle } from "~/metadata";
import { createBoardLayout } from "../_layout-creator";
import type { Board, Item } from "../_types";
import { DynamicClientBoard } from "./_dynamic-client";
import { BoardContentHeaderActions } from "./_header-actions";

const logger = createLogger({ module: "createBoardContentPage" });

export type Params = Record<string, unknown>;

interface Props<TParams extends Params> {
  getInitialBoardAsync: (params: TParams) => Promise<Board>;
}

export const createBoardContentPage = <TParams extends Record<string, unknown>>({
  getInitialBoardAsync: getInitialBoard,
}: Props<TParams>) => {
  return {
    layout: createBoardLayout({
      headerActions: <BoardContentHeaderActions />,
      getInitialBoardAsync: getInitialBoard,
      withTour: true,
    }),
    // eslint-disable-next-line no-restricted-syntax
    page: async ({ params }: { params: Promise<TParams> }) => {
      const resolvedParams = await params;
      const queryClient = getQueryClient();

      const [board, session] = await Promise.all([getInitialBoard(resolvedParams), auth()]);

      const itemsMap = board.items.reduce((acc, item) => {
        const existing = acc.get(item.kind);
        if (existing) {
          existing.push(item);
        } else {
          acc.set(item.kind, [item]);
        }
        return acc;
      }, new Map<WidgetKind, Item[]>());

      const [integrations] = await Promise.all([
        getIntegrationsWithPermissionsAsync(session),
        ...Array.from(itemsMap).map(([kind, items]) =>
          prefetchForKindAsync(kind, queryClient, items).catch((error) => {
            logger.error(
              new ErrorWithMetadata(
                "Failed to prefetch widget",
                { widgetKind: kind, itemCount: items.length },
                { cause: error },
              ),
            );
          }),
        ),
      ]);

      const userId = session?.user.id ?? "anonymous";

      return (
        <>
          <Suspense>
            <QueryCacheHydration userId={userId} boardId={board.id} />
          </Suspense>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <IntegrationProvider integrations={integrations}>
              <DynamicClientBoard />
            </IntegrationProvider>
          </HydrationBoundary>
        </>
      );
    },
    generateMetadataAsync: async ({ params }: { params: Promise<TParams> }): Promise<Metadata> => {
      try {
        const board = await getInitialBoard(await params);
        const t = await getI18n();

        return {
          title: board.metaTitle ?? createMetaTitle(t("board.content.metaTitle", { boardName: board.name })),
          icons: {
            icon: !isNullOrWhitespace(board.faviconImageUrl) ? board.faviconImageUrl : undefined,
            apple: !isNullOrWhitespace(board.faviconImageUrl) ? board.faviconImageUrl : undefined,
          },
          appleWebApp: {
            startupImage: {
              url: !isNullOrWhitespace(board.faviconImageUrl) ? board.faviconImageUrl : "/logo/logo.png",
            },
          },
        };
      } catch (error) {
        // Ignore not found errors and return empty metadata
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          return {};
        }

        throw error;
      }
    },
  };
};

async function QueryCacheHydration({ userId, boardId }: { userId: string; boardId: string }) {
  try {
    const serialized = await getQueryCacheAsync(userId, boardId);
    if (!serialized) return null;

    const persisted = superjson.parse<PersistedClient | undefined>(serialized);
    if (!persisted || persisted.buster !== queryCacheBuster) return null;
    if (!persisted.clientState?.queries?.length) return null;

    return <HydrationBoundary state={persisted.clientState} />;
  } catch (error) {
    logger.warn(new ErrorWithMetadata("Failed to hydrate query cache", { userId, boardId }, { cause: error }));
    return null;
  }
}
