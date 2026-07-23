import type { JSX, PropsWithChildren } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AppShellMain } from "@mantine/core";
import { TRPCError } from "@trpc/server";

import { auth } from "@homarr/auth/next";
import { BoardProvider } from "@homarr/boards/context";
import { EditModeProvider } from "@homarr/boards/edit-mode";
import { userAgent } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { MobileBoardDeviceClass } from "~/components/board/use-mobile-board";
import { MobileBoardViewportProvider } from "~/components/board/use-mobile-board";
import { MainHeader } from "~/components/layout/header";
import { ClientShell } from "~/components/layout/shell";
import { BoardTourProvider } from "~/components/onboarding/board-tour";
import { getCurrentColorSchemeAsync } from "~/theme/color-scheme";
import type { Board } from "./_types";
import type { Params } from "./(content)/_creator";
import { CustomCss } from "./(content)/_custom-css";
import { BoardReadyProvider } from "./(content)/_ready-context";
import { BoardMantineProvider } from "./(content)/_theme";
import { BoardSwitcherLogo } from "./_board-switcher-logo";

const logger = createLogger({ module: "createBoardLayout" });

const BoardTourWrapper = ({ hasSession, children }: PropsWithChildren<{ hasSession: boolean }>) => {
  if (!hasSession) return <>{children}</>;
  return <BoardTourProvider>{children}</BoardTourProvider>;
};

interface CreateBoardLayoutProps<TParams extends Params> {
  headerActions: JSX.Element;
  getInitialBoardAsync: (params: TParams) => Promise<Board>;
  withTour?: boolean;
  mobileProfileInActions?: boolean;
}

export const createBoardLayout = <TParams extends Params>({
  headerActions,
  getInitialBoardAsync: getInitialBoard,
  withTour = false,
  mobileProfileInActions = false,
}: CreateBoardLayoutProps<TParams>) => {
  const Layout = async ({
    params,
    children,
  }: PropsWithChildren<{
    params: Promise<TParams>;
  }>) => {
    const session = await auth();
    const initialBoard = await getInitialBoard(await params).catch((error) => {
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
    });
    const [colorScheme, requestHeaders] = await Promise.all([getCurrentColorSchemeAsync(), headers()]);
    const deviceType = userAgent(new Headers(requestHeaders)).device.type;
    const initialDeviceClass: MobileBoardDeviceClass =
      deviceType === "mobile" ? "phone" : deviceType === "tablet" ? "tablet" : "desktop";

    return (
      <MobileBoardViewportProvider initialDeviceClass={initialDeviceClass}>
        <BoardProvider initialBoard={initialBoard}>
          <BoardReadyProvider>
            <EditModeProvider>
              <BoardMantineProvider defaultColorScheme={colorScheme}>
                <CustomCss />
                <BoardTourWrapper hasSession={withTour && !!session}>
                  <ClientShell hasNavigation={false} withSafeArea>
                    <MainHeader
                      logo={<BoardSwitcherLogo />}
                      logoHref={null}
                      actions={headerActions}
                      hasNavigation={false}
                      withSafeArea
                      hideUserOnMobileBoard={mobileProfileInActions}
                    />
                    <AppShellMain
                      style={{
                        paddingRight: "calc(var(--mantine-spacing-md) + env(safe-area-inset-right))",
                        paddingBottom: "calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom))",
                        paddingLeft: "calc(var(--mantine-spacing-md) + env(safe-area-inset-left))",
                      }}
                    >
                      {children}
                    </AppShellMain>
                  </ClientShell>
                </BoardTourWrapper>
              </BoardMantineProvider>
            </EditModeProvider>
          </BoardReadyProvider>
        </BoardProvider>
      </MobileBoardViewportProvider>
    );
  };

  return Layout;
};
