import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ORPCError } from "@orpc/client";

import { dehydrate, hydrate, HydrationBoundary } from "@tanstack/react-query";
import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { api, getQueryClient } from "@homarr/api/server";
import { getLayoutIdForViewportWidth } from "@homarr/boards/layout-selection";
import { IntegrationProvider } from "@homarr/auth/client";
import { auth } from "@homarr/auth/next";
import { isNullOrWhitespace } from "@homarr/common";
import type { WidgetKind } from "@homarr/definitions";
import { getI18n } from "@homarr/translation/server";
import { prefetchForKind } from "@homarr/widgets/prefetch";

import { env } from "~/env";
import { createBoardLayout, getInitialViewportWidthAsync } from "../_layout-creator";
import type { Board, Item } from "../_types";
import { ClientBoard } from "./_client";
import { CachedWidgetRefresh } from "./_cached-widget-refresh";
import { BoardContentEditAction, BoardContentSettingsAction } from "./_header-actions";
import { WidgetResourcePreload } from "./_widget-resource-preload";

export type Params = Record<string, unknown>;

interface Props<TParams extends Params> {
  getInitialBoardAsync: (params: TParams) => Promise<Board>;
}

const BoardWithIntegrations = async ({
  integrationsPromise,
}: {
  integrationsPromise: ReturnType<typeof api.frontend.integrationPermissions.query>;
}) => (
  <IntegrationProvider integrations={await integrationsPromise}>
    <ClientBoard />
  </IntegrationProvider>
);

export const createBoardContentPage = <TParams extends Record<string, unknown>>({
  getInitialBoardAsync: getInitialBoard,
}: Props<TParams>) => {
  return {
    layout: createBoardLayout({
      headerBoardEditAction: <BoardContentEditAction demoReadOnly={env.DEMO_MODE && env.DEMO_READ_ONLY} />,
      headerBoardSettingsAction: <BoardContentSettingsAction demoReadOnly={env.DEMO_MODE && env.DEMO_READ_ONLY} />,
      getInitialBoardAsync: getInitialBoard,
      withTour: true,
      withBoardTabs: true,
    }),
    // eslint-disable-next-line no-restricted-syntax
    page: async ({ params }: { params: Promise<TParams> }) => {
      const resolvedParams = await params;
      const queryClient = getQueryClient();
      const sessionPromise = auth();
      const boardPromise = getInitialBoard(resolvedParams);
      const viewportWidthPromise = getInitialViewportWidthAsync();
      const integrationsPromise = api.frontend.integrationPermissions.query();
      // The board can fail independently of the permissions read (e.g. a missing board).
      void integrationsPromise.catch(() => undefined);

      const board = await boardPromise.catch(async (error: unknown) => {
        if (error instanceof ORPCError && error.code === "NOT_FOUND") {
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

        if (error instanceof ORPCError && error.code === "BAD_REQUEST") {
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
      const snapshot = await api.board.getWidgetQuerySnapshot.query({ boardId: board.id, layoutId });
      hydrate(queryClient, snapshot.state);

      return (
        <>
          <WidgetResourcePreload />
          <HydrationBoundary state={dehydrate(queryClient)}>
            {snapshot.refreshQueryHashes.length > 0 && (
              <CachedWidgetRefresh queryHashes={snapshot.refreshQueryHashes} />
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
        if (error instanceof ORPCError && (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")) {
          return {};
        }

        throw error;
      }
    },
  };
};
