import type { Metadata } from "next";
import { Suspense } from "react";
import type { JSX } from "react";
import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { defaultShouldDehydrateQuery, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { getQueryClient } from "@homarr/api/server";
import { IntegrationProvider } from "@homarr/auth/client";
import { auth } from "@homarr/auth/next";
import { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { getLayoutIdForViewportWidth, getRequestedLayoutId } from "@homarr/boards/layout-selection";
import { boardTabSearchParam, findBoardTab, getBoardTabs } from "@homarr/boards/tab-selection";
import { isNullOrWhitespace } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import { prepareIntegrationResponseCacheAsync } from "@homarr/redis";
import { getI18n } from "@homarr/translation/server";
import { prefetchForKind } from "@homarr/widgets/prefetch";
import { prefetchInitialWidgetData } from "@homarr/widgets/server-prefetch";

import { env } from "~/env";
import { createBoardLayout, getInitialViewportWidthAsync } from "../_layout-creator";
import type { Board, SectionItem } from "../_types";
import { ClientBoard } from "./_client";
import { CachedWidgetRefresh } from "./_cached-widget-refresh";
import { BoardContentEditAction, BoardContentSettingsAction } from "./_header-actions";
import { createBoardQuerySnapshot } from "./_query-snapshot";
import { getVisibleWidgetItems } from "~/components/board/layout/visible-widget-items";
import { WidgetResourcePreload } from "./_widget-resource-preload";

export type Params = Record<string, unknown>;

type SearchParams = Record<string, string | string[] | undefined>;
const firstParam = (value: SearchParams[string]) => (Array.isArray(value) ? value[0] : value);

interface Props<TParams extends Params> {
  getInitialBoardAsync: (params: TParams) => Promise<Board>;
  notFoundComponent?: () => Promise<JSX.Element>;
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

export const createBoardContentPage = <TParams extends Record<string, unknown>>({
  getInitialBoardAsync: getInitialBoard,
  notFoundComponent: NotFoundComponent,
}: Props<TParams>) => {
  return {
    layout: createBoardLayout({
      headerBoardEditAction: <BoardContentEditAction demoReadOnly={env.DEMO_MODE && env.DEMO_READ_ONLY} />,
      headerBoardSettingsAction: <BoardContentSettingsAction demoReadOnly={env.DEMO_MODE && env.DEMO_READ_ONLY} />,
      getInitialBoardAsync: getInitialBoard,
      notFoundComponent: NotFoundComponent,
      withTour: true,
      withBoardTabs: true,
    }),
    // eslint-disable-next-line no-restricted-syntax
    page: async ({ params, searchParams }: { params: Promise<TParams>; searchParams: Promise<SearchParams> }) => {
      void prepareIntegrationResponseCacheAsync().catch(() => undefined);
      const resolvedParams = await params;
      const queryClient = getQueryClient();
      const sessionPromise = auth();
      const boardPromise = getInitialBoard(resolvedParams);
      const viewportWidthPromise = getInitialViewportWidthAsync();
      const integrationsPromise = sessionPromise.then(getIntegrationsWithPermissionsAsync);
      // The board can fail independently of the permissions read (e.g. a missing board).
      void integrationsPromise.catch(() => undefined);

      let board: Board;
      try {
        board = await boardPromise;
      } catch (error: unknown) {
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          const session = await sessionPromise;
          if (!session) {
            const requestedBoardName =
              typeof resolvedParams.name === "string" ? `/boards/${encodeURIComponent(resolvedParams.name)}` : null;
            redirect(
              requestedBoardName ? `/auth/login?callbackUrl=${encodeURIComponent(requestedBoardName)}` : "/auth/login",
            );
          }

          if (NotFoundComponent) return <NotFoundComponent />;

          notFound();
        }

        if (error instanceof TRPCError && error.code === "BAD_REQUEST") {
          notFound();
        }

        throw error;
      }

      const [routeSearch, viewportWidth] = await Promise.all([searchParams, viewportWidthPromise]);
      const requestedLayoutId = getRequestedLayoutId(
        board.layouts,
        firstParam(routeSearch.layout),
        firstParam(routeSearch.edit),
      );
      let layoutId = getLayoutIdForViewportWidth(board.layouts, viewportWidth);
      if (requestedLayoutId && constructBoardPermissions(board, await sessionPromise).hasChangeAccess) {
        layoutId = requestedLayoutId;
      }
      const tabs = getBoardTabs(board);
      const tabId = (findBoardTab(tabs, firstParam(routeSearch[boardTabSearchParam])) ?? tabs[0])?.id;
      const visibleItems = getVisibleWidgetItems(board, layoutId, tabId);
      const itemsMap = visibleItems.reduce((acc, item) => {
        const existing = acc.get(item.kind);
        if (existing) {
          existing.push(item);
        } else {
          acc.set(item.kind, [item]);
        }
        return acc;
      }, new Map<WidgetKind, SectionItem[]>());
      const canReadDockerLink = sessionPromise.then((session) => session?.user.permissions.includes("admin") ?? false);
      for (const [kind, items] of itemsMap) prefetchForKind(kind, queryClient, items, canReadDockerLink);

      const [session, integrations] = await Promise.all([sessionPromise, integrationsPromise]);
      const snapshot = createBoardQuerySnapshot(board, integrations);
      await snapshot.restoreAsync(queryClient).catch(() => undefined);
      const restoredQueryHashes = new Set(
        queryClient
          .getQueryCache()
          .getAll()
          .filter((query) => query.meta?.rscWidgetPrefetch === true && query.state.status === "success")
          .map((query) => query.queryHash),
      );
      const dependentQueries = prefetchInitialWidgetData(queryClient, visibleItems, Boolean(session));
      const refreshingQueries = queryClient
        .getQueryCache()
        .getAll()
        .flatMap((query) => {
          if (query.meta?.rscWidgetPrefetch !== true || !query.promise) return [];
          return [{ queryHash: query.queryHash, promise: query.promise }];
        });
      const restoredRefreshes = refreshingQueries.filter(({ queryHash }) => restoredQueryHashes.has(queryHash));
      void Promise.allSettled([...refreshingQueries.map(({ promise }) => promise), ...dependentQueries])
        .then(async () => {
          const lateQueries = queryClient
            .getQueryCache()
            .getAll()
            .flatMap((query) => {
              if (query.meta?.rscWidgetPrefetch !== true || !query.promise) return [];
              return [query.promise];
            });
          await Promise.allSettled(lateQueries);
          await snapshot.saveAsync(queryClient);
        })
        .catch(() => undefined);

      return (
        <>
          <WidgetResourcePreload />
          <HydrationBoundary
            state={dehydrate(queryClient, {
              shouldDehydrateQuery: (query) =>
                defaultShouldDehydrateQuery(query) ||
                (query.meta?.rscWidgetPrefetch !== true && query.state.status === "pending"),
            })}
          >
            {restoredRefreshes.length > 0 && (
              <CachedWidgetRefresh queryHashes={restoredRefreshes.map(({ queryHash }) => queryHash)} />
            )}
            <Suspense fallback={null}>
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
