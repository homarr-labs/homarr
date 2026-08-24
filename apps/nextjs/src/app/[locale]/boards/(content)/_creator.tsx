import type { Metadata } from "next";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { makeQueryClient } from "@homarr/api/shared";
import { IntegrationProvider } from "@homarr/auth/client";
import { auth } from "@homarr/auth/next";
import { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";
import { isNullOrWhitespace } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";
import type { WidgetKind } from "@homarr/definitions";
import { getI18n } from "@homarr/translation/server";
import { prefetchForKindAsync } from "@homarr/widgets/prefetch";

import { env } from "~/env";
import { createBoardLayout } from "../_layout-creator";
import type { Board, Item } from "../_types";
import { ClientBoard } from "./_client";
import { BoardContentEditAction, BoardContentSettingsAction } from "./_header-actions";

const logger = createLogger({ module: "createBoardContentPage" });
const getQueryClient = cache(makeQueryClient);

export type Params = Record<string, unknown>;

interface Props<TParams extends Params> {
  getInitialBoardAsync: (params: TParams) => Promise<Board>;
}

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
      const resolvedParams = await params;
      const queryClient = getQueryClient();
      const sessionPromise = auth();
      const boardPromise = getInitialBoard(resolvedParams);
      const session = await sessionPromise;

      const board = await boardPromise.catch((error) => {
        if (error instanceof TRPCError && error.code === "NOT_FOUND") {
          if (!session) {
            logger.debug("No home board found for anonymous user, redirecting to login");
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

      return (
        <HydrationBoundary state={dehydrate(queryClient)}>
          <IntegrationProvider integrations={integrations}>
            <ClientBoard />
          </IntegrationProvider>
        </HydrationBoundary>
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
