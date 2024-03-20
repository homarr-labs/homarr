import type { PropsWithChildren, ReactNode } from "react";
import type { Metadata } from "next";

import { capitalize } from "@homarr/common";
import { AppShellMain } from "@homarr/ui";

import { MainHeader } from "~/components/layout/header";
import { BoardLogoWithTitle } from "~/components/layout/logo/board-logo";
import { ClientShell } from "~/components/layout/shell";
import { ClientBoard } from "./_client";
import { BoardProvider } from "./_context";
import type { Board } from "./_types";
// This is placed here because it's used in the layout and the page and because it's here it's not needed to load it everywhere
import "../../../styles/gridstack.scss";

import { notFound } from "next/navigation";

import { auth } from "@homarr/auth";
import { and, db, eq, schema } from "@homarr/db";
import { GlobalItemServerDataRunner } from "@homarr/widgets";

import { BoardMantineProvider } from "./_theme";

type Params = Record<string, unknown>;

interface Props<TParams extends Params> {
  getInitialBoard: (params: TParams) => Promise<Board>;
}

export const createBoardPage = <TParams extends Record<string, unknown>>({
  getInitialBoard,
}: Props<TParams>) => {
  return {
    layout: async ({
      params,
      children,
      headeractions,
    }: PropsWithChildren<{ params: TParams; headeractions: ReactNode }>) => {
      const initialBoard = await getInitialBoard(params);

      return (
        <GlobalItemServerDataRunner board={initialBoard}>
          <BoardProvider initialBoard={initialBoard}>
            <BoardMantineProvider>
              <ClientShell hasNavigation={false}>
                <MainHeader
                  logo={<BoardLogoWithTitle size="md" hideTitleOnMobile />}
                  actions={headeractions}
                  hasNavigation={false}
                />
                <AppShellMain>{children}</AppShellMain>
              </ClientShell>
            </BoardMantineProvider>
          </BoardProvider>
        </GlobalItemServerDataRunner>
      );
    },
    page: async ({ params }: { params: TParams }) => {
      const board = await getInitialBoard(params);

      if (await canAccessBoardAsync(board)) {
        return <ClientBoard />;
      }

      return notFound();
    },
    generateMetadata: async ({
      params,
    }: {
      params: TParams;
    }): Promise<Metadata> => {
      const board = await getInitialBoard(params);

      if (!(await canAccessBoardAsync(board))) {
        return {};
      }

      return {
        title: board.metaTitle ?? `${capitalize(board.name)} board | Homarr`,
        icons: {
          icon: board.faviconImageUrl ? board.faviconImageUrl : undefined,
        },
      };
    },
  };
};

const canAccessBoardAsync = async (board: Board) => {
  const session = await auth();

  if (board.isPublic) {
    return true; // Public boards can be accessed by anyone
  }

  if (!session) {
    return false; // Not logged in users can't access private boards
  }

  if (board.creatorId === session?.user.id) {
    return true; // Creators can access their own private boards
  }

  const permissions = await db.query.boardPermissions.findMany({
    where: and(
      eq(schema.boardPermissions.userId, session.user.id),
      eq(schema.boardPermissions.boardId, board.id),
    ),
  });

  return ["board-view", "board-change"].some((key) =>
    permissions.some(({ permission }) => key === permission),
  ); // Allow access for all with any board permission
};
