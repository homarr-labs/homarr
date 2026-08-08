import type { JSX, PropsWithChildren } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AppShellMain } from "@mantine/core";
import { TRPCError } from "@trpc/server";

import { getRscUserSettingsAsync } from "@homarr/api/user-server";
import { auth } from "@homarr/auth/next";
import { BoardProvider } from "@homarr/boards/context";
import { EditModeProvider } from "@homarr/boards/edit-mode";
import { userAgent } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";

import { MainHeader } from "~/components/layout/header";
import { MobileBoardViewportProvider } from "~/components/board/use-mobile-board";
import { BoardLogoWithTitle } from "~/components/layout/logo/board-logo";
import { ClientShell } from "~/components/layout/shell";
import { BoardTourGate } from "~/components/onboarding/board-tour-gate";
import { env } from "~/env";
import { getCurrentColorSchemeAsync } from "~/theme/color-scheme";
import type { Board } from "./_types";
import type { Params } from "./(content)/_creator";
import { CustomCss } from "./(content)/_custom-css";
import { BoardReadyProvider } from "./(content)/_ready-context";
import { BoardMantineProvider } from "./(content)/_theme";

const logger = createLogger({ module: "createBoardLayout" });

interface CreateBoardLayoutProps<TParams extends Params> {
  headerActions: JSX.Element;
  getInitialBoardAsync: (params: TParams) => Promise<Board>;
  withTour?: boolean;
}

export const createBoardLayout = <TParams extends Params>({
  headerActions,
  getInitialBoardAsync: getInitialBoard,
  withTour = false,
}: CreateBoardLayoutProps<TParams>) => {
  const Layout = async ({
    params,
    children,
  }: PropsWithChildren<{
    params: Promise<TParams>;
  }>) => {
    const resolvedParams = await params;
    const sessionPromise = auth();
    const initialBoardPromise = getInitialBoard(resolvedParams).then(
      (board) => ({ status: "fulfilled", board }) as const,
      (error: unknown) => ({ status: "rejected", error }) as const,
    );
    const colorSchemePromise = getCurrentColorSchemeAsync();
    const requestHeadersPromise = headers();
    const shouldRunBoardTourPromise = sessionPromise.then(async (session) => {
      if (!withTour || !session || env.DEMO_MODE) return false;

      try {
        const user = await getRscUserSettingsAsync(session.user.id);
        return user !== undefined && !user.completedBoardTour;
      } catch (error) {
        logger.error(new Error("Failed to load the board tour status", { cause: error }));
        return false;
      }
    });
    const [session, initialBoardResult, colorScheme, requestHeaders, shouldRunBoardTour] = await Promise.all([
      sessionPromise,
      initialBoardPromise,
      colorSchemePromise,
      requestHeadersPromise,
      shouldRunBoardTourPromise,
    ]);
    if (initialBoardResult.status === "rejected") {
      const { error } = initialBoardResult;
      if (error instanceof TRPCError && error.code === "NOT_FOUND") {
        if (!session) {
          logger.debug("No home board found for anonymous user, redirecting to login");
          redirect("/auth/login");
        }

        logger.warn(error);
        notFound();
      }

      if (error instanceof TRPCError && error.code === "BAD_REQUEST") {
        notFound();
      }

      throw error;
    }
    const initialBoard = initialBoardResult.board;
    const deviceType = userAgent(new Headers(requestHeaders)).device.type;
    const initialIsMobile = deviceType === "mobile" || deviceType === "tablet";

    return (
      <MobileBoardViewportProvider initialIsMobile={initialIsMobile}>
        <BoardProvider initialBoard={initialBoard}>
          <BoardReadyProvider>
            <EditModeProvider>
              <BoardMantineProvider defaultColorScheme={colorScheme}>
                <CustomCss />
                <BoardTourGate enabled={shouldRunBoardTour}>
                  <ClientShell hasNavigation={false}>
                    <MainHeader
                      logo={<BoardLogoWithTitle size="md" hideTitleOnMobile />}
                      actions={headerActions}
                      hasNavigation={false}
                    />
                    <AppShellMain>{children}</AppShellMain>
                  </ClientShell>
                </BoardTourGate>
              </BoardMantineProvider>
            </EditModeProvider>
          </BoardReadyProvider>
        </BoardProvider>
      </MobileBoardViewportProvider>
    );
  };

  return Layout;
};
