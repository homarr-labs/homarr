import { createHash } from "node:crypto";

import type { JSX, PropsWithChildren } from "react";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { TRPCError } from "@trpc/server";

import { getRscUserSettingsAsync } from "@homarr/api/user-server";
import { auth } from "@homarr/auth/next";
import { BoardProvider } from "@homarr/boards/context";
import { EditModeProvider } from "@homarr/boards/edit-mode";
import { dbEnv } from "@homarr/core/infrastructure/db/env";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { v2BetaAnnouncementCookieKey } from "@homarr/definitions";

import { MainHeaderContent } from "~/components/layout/header";
import { BoardLogoWithTitle } from "~/components/layout/logo/board-logo";
import { V2BetaDashboardShell } from "~/components/layout/v2-beta-announcement/v2-beta-dashboard-shell";
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
    const cookiesPromise = cookies();
    const initialBoardPromise = getInitialBoard(resolvedParams).then(
      (board) => ({ status: "fulfilled", board }) as const,
      (error: unknown) => ({ status: "rejected", error }) as const,
    );
    const colorSchemePromise = getCurrentColorSchemeAsync();
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
    const [session, initialBoardResult, colorScheme, shouldRunBoardTour, cookieStore] = await Promise.all([
      sessionPromise,
      initialBoardPromise,
      colorSchemePromise,
      shouldRunBoardTourPromise,
      cookiesPromise,
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
    const viewerIdentity = session?.user.id ?? "anonymous";
    const viewerHash = createHash("sha256").update(viewerIdentity).digest("hex").slice(0, 16);
    const dismissalCookieName = `${v2BetaAnnouncementCookieKey}.${viewerHash}`;
    const isAnnouncementDismissed = cookieStore.get(dismissalCookieName)?.value === "dismissed";
    const canExportBackup = dbEnv.DRIVER === "better-sqlite3" && Boolean(session?.user.permissions.includes("admin"));

    return (
      <BoardProvider initialBoard={initialBoard}>
        <BoardReadyProvider>
          <EditModeProvider>
            <BoardMantineProvider defaultColorScheme={colorScheme}>
              <CustomCss />
              <BoardTourGate enabled={shouldRunBoardTour}>
                <V2BetaDashboardShell
                  canExportBackup={canExportBackup}
                  dismissalCookieName={dismissalCookieName}
                  initiallyDismissed={isAnnouncementDismissed}
                  header={
                    <MainHeaderContent
                      logo={<BoardLogoWithTitle size="md" hideTitleOnMobile />}
                      actions={headerActions}
                      hasNavigation={false}
                    />
                  }
                >
                  {children}
                </V2BetaDashboardShell>
              </BoardTourGate>
            </BoardMantineProvider>
          </EditModeProvider>
        </BoardReadyProvider>
      </BoardProvider>
    );
  };

  return Layout;
};
