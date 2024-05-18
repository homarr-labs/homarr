import type { Metadata } from "next";
import { TRPCError } from "@trpc/server";

// Placed here because gridstack styles are used for board content
import "~/styles/gridstack.scss";

import { getI18n } from "@homarr/translation/server";

import { createMetaTitle } from "~/metadata";
import { createBoardLayout } from "../_layout-creator";
import type { Board } from "../_types";
import { ClientBoard } from "./_client";
import { BoardContentHeaderActions } from "./_header-actions";

export type Params = Record<string, unknown>;

interface Props<TParams extends Params> {
  getInitialBoard: (params: TParams) => Promise<Board>;
}

export const createBoardContentPage = <
  TParams extends Record<string, unknown>,
>({
  getInitialBoard,
}: Props<TParams>) => {
  return {
    layout: createBoardLayout({
      headerActions: <BoardContentHeaderActions />,
      getInitialBoard,
      isBoardContentPage: true,
    }),
    page: () => {
      return <ClientBoard />;
    },
    generateMetadata: async ({
      params,
    }: {
      params: TParams;
    }): Promise<Metadata> => {
      try {
        const board = await getInitialBoard(params);
        const t = await getI18n();

        return {
          title:
            board.metaTitle ??
            createMetaTitle(
              t("board.content.metaTitle", { boardName: board.name }),
            ),
          icons: {
            icon: board.faviconImageUrl ? board.faviconImageUrl : undefined,
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
