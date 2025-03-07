import type { Metadata } from "next";
import { TRPCError } from "@trpc/server";

// Placed here because gridstack styles are used for board content
import "~/styles/gridstack.scss";

import { IntegrationProvider } from "@homarr/auth/client";
import { auth } from "@homarr/auth/next";
import { getIntegrationsWithPermissionsAsync } from "@homarr/auth/server";
import { isNullOrWhitespace } from "@homarr/common";
import { getI18n } from "@homarr/translation/server";

import { createMetaTitle } from "~/metadata";
import { createBoardLayout } from "../_layout-creator";
import type { Board } from "../_types";
import { DynamicClientBoard } from "./_dynamic-client";
import { BoardContentHeaderActions } from "./_header-actions";

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
    }),
    // eslint-disable-next-line no-restricted-syntax
    page: async () => {
      const session = await auth();
      const integrations = await getIntegrationsWithPermissionsAsync(session);

      return (
        <IntegrationProvider integrations={integrations}>
          <DynamicClientBoard />
        </IntegrationProvider>
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
