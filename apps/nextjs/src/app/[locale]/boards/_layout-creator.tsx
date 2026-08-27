import type { JSX, PropsWithChildren } from "react";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AppShellMain } from "@mantine/core";
import { TRPCError } from "@trpc/server";

import { getRscUserSettingsAsync } from "@homarr/api/user-server";
import { auth } from "@homarr/auth/next";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { boardViewportWidthCookieName, getLayoutIdForViewportWidth } from "@homarr/boards/layout-selection";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ModalProvider } from "@homarr/modals";

import { MainHeader } from "~/components/layout/header";
import { appShellLogoHeight } from "~/components/layout/constants";
import { BoardLogo, BoardLogoWithTitle } from "~/components/layout/logo/board-logo";
import { ClientShell } from "~/components/layout/shell";
import { BoardTourGate } from "~/components/onboarding/board-tour-gate";
import { env } from "~/env";
import { getCurrentColorSchemeAsync } from "~/theme/color-scheme";
import type { Board } from "./_types";
import { BoardProviders } from "./_providers";
import type { Params } from "./(content)/_creator";
import { CustomCss } from "./(content)/_custom-css";
import { BoardReadyProvider } from "./(content)/_ready-context";
import { BoardMantineProvider } from "./(content)/_theme";

const logger = createLogger({ module: "createBoardLayout" });

interface CreateBoardLayoutProps<TParams extends Params> {
  headerActions?: JSX.Element;
  headerBoardEditAction?: JSX.Element;
  headerBoardSettingsAction?: JSX.Element;
  getInitialBoardAsync: (params: TParams) => Promise<Board>;
  withTour?: boolean;
}

export const createBoardLayout = <TParams extends Params>({
  headerActions,
  headerBoardEditAction,
  headerBoardSettingsAction,
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
    const initialViewportWidthPromise = getInitialViewportWidthAsync();
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
    const [session, initialBoardResult, colorScheme, shouldRunBoardTour, initialViewportWidth] = await Promise.all([
      sessionPromise,
      initialBoardPromise,
      colorSchemePromise,
      shouldRunBoardTourPromise,
      initialViewportWidthPromise,
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
    const { hasChangeAccess } = constructBoardPermissions(initialBoard, session);
    const initialLayoutId = getLayoutIdForViewportWidth(initialBoard.layouts, initialViewportWidth);

    return (
      <BoardProviders
        initialBoard={initialBoard}
        initialLayoutId={initialLayoutId}
        initialViewportWidth={initialViewportWidth}
        canModify={hasChangeAccess}
      >
        <BoardReadyProvider>
          <BoardMantineProvider defaultColorScheme={colorScheme}>
            <ModalProvider>
              <CustomCss />
              <BoardTourGate enabled={shouldRunBoardTour}>
                <ClientShell hasNavigation={false}>
                  <MainHeader
                    logo={<BoardLogo size={appShellLogoHeight} />}
                    logoWithTitle={<BoardLogoWithTitle size="md" />}
                    actions={headerActions}
                    boardEditAction={headerBoardEditAction}
                    boardSettingsAction={headerBoardSettingsAction}
                    hasNavigation={false}
                  />
                  <AppShellMain data-advanced-focus-background>{children}</AppShellMain>
                </ClientShell>
              </BoardTourGate>
            </ModalProvider>
          </BoardMantineProvider>
        </BoardReadyProvider>
      </BoardProviders>
    );
  };

  return Layout;
};

const getInitialViewportWidthAsync = async () => {
  const cookieValue = (await cookies()).get(boardViewportWidthCookieName)?.value;
  const cookieWidth = Number(cookieValue);
  if (Number.isInteger(cookieWidth) && cookieWidth >= 200 && cookieWidth <= 10_000) {
    return cookieWidth;
  }

  const requestHeaders = await headers();
  const clientHintWidth = Number(requestHeaders.get("sec-ch-viewport-width"));
  if (Number.isInteger(clientHintWidth) && clientHintWidth >= 200 && clientHintWidth <= 10_000) {
    return clientHintWidth;
  }

  const userAgent = requestHeaders.get("user-agent") ?? "";
  if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent)) return 1024;
  if (/Mobi|Android|iPhone|iPod|IEMobile|Opera Mini/i.test(userAgent)) return 390;
  return 1440;
};
