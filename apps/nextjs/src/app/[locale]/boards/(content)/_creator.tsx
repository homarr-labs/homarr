import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

import type { QueryClient } from "@tanstack/react-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { getQueryClient } from "@homarr/api/server";
import { getLayoutIdForViewportWidth } from "@homarr/boards/layout-selection";
import { IntegrationProvider } from "@homarr/auth/client";
import { auth } from "@homarr/auth/next";
import { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";
import { isNullOrWhitespace } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import { prepareIntegrationResponseCacheAsync } from "@homarr/redis";
import { getI18n } from "@homarr/translation/server";
import { prefetchForKind } from "@homarr/widgets/prefetch";
import { getInitiallyVisibleWidgetKinds, prefetchInitialWidgetData } from "@homarr/widgets/server-prefetch";

import { env } from "~/env";
import { createBoardLayout, getInitialViewportWidthAsync } from "../_layout-creator";
import type { Board, Item } from "../_types";
import { ClientBoard } from "./_client";
import { BoardContentEditAction, BoardContentSettingsAction } from "./_header-actions";
import { BoardLoadingShell } from "./_loading-shell";
import { WidgetResourcePreload } from "./_widget-resource-preload";

export type Params = Record<string, unknown>;

interface Props<TParams extends Params> {
  getInitialBoardAsync: (params: TParams) => Promise<Board>;
}

const BoardWithIntegrations = async ({
  integrationsPromise,
}: {
  integrationsPromise: ReturnType<typeof getIntegrationsWithPermissionsAsync>;
}) => (
  <IntegrationProvider integrations={await integrationsPromise}>
    <ClientBoard />
  </IntegrationProvider>
);

const DeferredWidgetHydration = async ({
  queryClient,
  queries,
}: {
  queryClient: QueryClient;
  queries: Promise<void>[];
}) => {
  await Promise.allSettled(queries);
  return (
    <HydrationBoundary
      state={dehydrate(queryClient, {
        shouldDehydrateQuery: (query) =>
          query.meta?.streamedBeszelSelection === true &&
          (query.state.status === "pending" || query.state.status === "success"),
      })}
    />
  );
};

export const createBoardContentPage = <TParams extends Record<string, unknown>>({
  getInitialBoardAsync: getInitialBoard,
}: Props<TParams>) => {
  return {
    layout: createBoardLayout({
      headerBoardEditAction: <BoardContentEditAction demoReadOnly={env.DEMO_MODE && env.DEMO_READ_ONLY} />,
      headerBoardSettingsAction: <BoardContentSettingsAction demoReadOnly={env.DEMO_MODE && env.DEMO_READ_ONLY} />,
      getInitialBoardAsync: getInitialBoard,
      withTour: true,
    }),
    // eslint-disable-next-line no-restricted-syntax
    page: async ({ params }: { params: Promise<TParams> }) => {
      void prepareIntegrationResponseCacheAsync().catch(() => undefined);
      const resolvedParams = await params;
      const queryClient = getQueryClient();
      const sessionPromise = auth();
      const boardPromise = getInitialBoard(resolvedParams);
      const viewportWidthPromise = getInitialViewportWidthAsync();
      const integrationsPromise = sessionPromise.then(getIntegrationsWithPermissionsAsync);
      // The board can fail independently of the permissions read (e.g. a missing board).
      void integrationsPromise.catch(() => undefined);

      const board = await boardPromise.catch(async (error: unknown) => {
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          const session = await sessionPromise;
          if (!session) {
            const requestedBoardName =
              typeof resolvedParams.name === "string" ? `/boards/${encodeURIComponent(resolvedParams.name)}` : null;
            redirect(
              requestedBoardName ? `/auth/login?callbackUrl=${encodeURIComponent(requestedBoardName)}` : "/auth/login",
            );
          }

          notFound();
        }

        if (error instanceof TRPCError && error.code === "BAD_REQUEST") {
          notFound();
        }

        throw error;
      });

      const itemsMap = board.items.reduce((acc, item) => {
        const existing = acc.get(item.kind);
        if (existing) {
          existing.push(item);
        } else {
          acc.set(item.kind, [item]);
        }
        return acc;
      }, new Map<WidgetKind, Item[]>());
      for (const [kind, items] of itemsMap) prefetchForKind(kind, queryClient, items);

      const layoutId = getLayoutIdForViewportWidth(board.layouts, await viewportWidthPromise);
      const dependentQueries = prefetchInitialWidgetData(queryClient, board, layoutId, Boolean(await sessionPromise));

      return (
        <>
          <WidgetResourcePreload kinds={getInitiallyVisibleWidgetKinds(board, layoutId)} />
          <HydrationBoundary state={dehydrate(queryClient)}>
            {dependentQueries.length > 0 && (
              <Suspense fallback={null}>
                <DeferredWidgetHydration queryClient={queryClient} queries={dependentQueries} />
              </Suspense>
            )}
            <Suspense fallback={<BoardLoadingShell />}>
              <BoardWithIntegrations integrationsPromise={integrationsPromise} />
            </Suspense>
          </HydrationBoundary>
        </>
      );
    },
    generateMetadataAsync: async ({ params }: { params: Promise<TParams> }): Promise<Metadata> => {
      try {
        const [board, t, serverSettings] = await Promise.all([
          getInitialBoard(await params),
          getI18n("board"),
          getRscServerSettingsAsync(),
        ]);
        const brandLogo = serverSettings.branding.logoImageUrl ?? "/logo/logo.png";
        const brandFavicon = serverSettings.branding.faviconImageUrl ?? brandLogo;
        const favicon = !isNullOrWhitespace(board.faviconImageUrl) ? board.faviconImageUrl : brandFavicon;

        return {
          title: board.metaTitle ? { absolute: board.metaTitle } : t("content.metaTitle", { boardName: board.name }),
          icons: {
            icon: favicon,
            apple: favicon,
          },
          appleWebApp: {
            startupImage: {
              url: favicon,
            },
          },
        };
      } catch (error) {
        // Ignore not found and bad-request errors and return empty metadata
        if (error instanceof TRPCError && (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")) {
          return {};
        }

        throw error;
      }
    },
  };
};
