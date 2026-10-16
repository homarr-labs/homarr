"use client";

import type { ReactNode } from "react";

import { useOptionalBoard } from "@homarr/boards/context";
import { UserAvatar } from "@homarr/ui";

import { appShellLogoHeight } from "~/components/layout/constants";
import { ConfigurableHeader } from "~/components/layout/header/configurable-header";
import { BoardLogo, BoardLogoWithTitle } from "~/components/layout/logo/board-logo";
import { HomarrLogo, HomarrLogoWithTitle } from "~/components/layout/logo/homarr-logo";

import { WorkerDock } from "./dock";
import { useWorkerBootstrap } from "./context";

export function WorkerHeader({
  hasNavigation = false,
  boardEditAction,
  boardSettingsAction,
}: {
  hasNavigation?: boolean;
  boardEditAction?: ReactNode;
  boardSettingsAction?: ReactNode;
}) {
  const { session, runtime } = useWorkerBootstrap();
  const board = useOptionalBoard();
  let logo = <HomarrLogo size={appShellLogoHeight} />;
  let logoWithTitle = <HomarrLogoWithTitle size="md" />;
  if (board) {
    logo = <BoardLogo size={appShellLogoHeight} />;
    logoWithTitle = <BoardLogoWithTitle size="md" />;
  }
  return (
    <ConfigurableHeader
      actions={<WorkerDock />}
      logo={logo}
      logoWithTitle={logoWithTitle}
      avatar={
        <UserAvatar
          user={{
            name: session.user.name ?? null,
            email: session.user.email ?? null,
            image: session.user.image ?? null,
          }}
          size="md"
        />
      }
      userId={session.user.id}
      isAdmin={session.user.permissions.includes("admin")}
      isDockerEnabled={session.user.permissions.includes("admin") && runtime.dockerEnabled}
      hasNavigation={hasNavigation}
      boardEditAction={boardEditAction}
      boardSettingsAction={boardSettingsAction}
    />
  );
}
