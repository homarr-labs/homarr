import type { Metadata } from "next";
import { TRPCError } from "@trpc/server";

import { capitalize } from "@homarr/common";

// This is placed here because it's used in the layout and the page and because it's here it's not needed to load it everywhere
import "~/styles/gridstack.scss";

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
      isContentPage: true,
      headerActions: <BoardContentHeaderActions />,
      getInitialBoard,
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

        return {
          title: board.metaTitle ?? `${capitalize(board.name)} board | Homarr`,
          icons: {
            icon: board.faviconImageUrl ? board.faviconImageUrl : undefined,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          return {};
        }

        throw error;
      }
    },
  };
};
