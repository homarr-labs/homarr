import type { PropsWithChildren } from "react";
import { notFound } from "next/navigation";
import { AppShellMain } from "@mantine/core";
import { TRPCError } from "@trpc/server";

import { logger } from "@homarr/log";
import { GlobalItemServerDataRunner } from "@homarr/widgets";

import { MainHeader } from "~/components/layout/header";
import { BoardLogoWithTitle } from "~/components/layout/logo/board-logo";
import { ClientShell } from "~/components/layout/shell";
import type { Board } from "./_types";
import { BoardProvider } from "./(content)/_context";
import type { Params } from "./(content)/_creator";
import { BoardMantineProvider } from "./(content)/_theme";

interface CreateBoardLayoutProps<TParams extends Params> {
  headerActions: JSX.Element;
  getInitialBoardAsync: (params: TParams) => Promise<Board>;
  isBoardContentPage: boolean;
}

export const createBoardLayout = <TParams extends Params>({
  headerActions,
  getInitialBoardAsync: getInitialBoard,
  isBoardContentPage,
}: CreateBoardLayoutProps<TParams>) => {
  const Layout = async ({
    params,
    children,
  }: PropsWithChildren<{
    params: TParams;
  }>) => {
    const initialBoard = await getInitialBoard(params).catch((error) => {
      if (error instanceof TRPCError && error.code === "NOT_FOUND") {
        logger.warn(error);
        notFound();
      }

      throw error;
    });

    return (
      <GlobalItemServerDataRunner board={initialBoard} shouldRun={isBoardContentPage}>
        <BoardProvider initialBoard={initialBoard}>
          <BoardMantineProvider>
            <ClientShell hasNavigation={false}>
              <MainHeader
                logo={<BoardLogoWithTitle size="md" hideTitleOnMobile />}
                actions={headerActions}
                hasNavigation={false}
              />
              <AppShellMain>{children}</AppShellMain>
            </ClientShell>
          </BoardMantineProvider>
        </BoardProvider>
      </GlobalItemServerDataRunner>
    );
  };

  return Layout;
};
