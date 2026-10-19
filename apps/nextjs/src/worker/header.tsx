"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { NativeSelect } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useOptionalBoard } from "@homarr/boards/context";
import { UserAvatar } from "@homarr/ui";

import { appShellLogoHeight } from "~/components/layout/constants";
import { ConfigurableHeader } from "~/components/layout/header/configurable-header";
import { BoardLogo, BoardLogoWithTitle } from "~/components/layout/logo/board-logo";
import { HomarrLogo, HomarrLogoWithTitle } from "~/components/layout/logo/homarr-logo";

import { WorkerDock } from "./dock";
import { useWorkerBootstrap, useWorkerConnections } from "./context";

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
  const router = useRouter();
  const connections = useWorkerConnections();
  const selected = connections.workers.find(({ worker }) => worker.workerId === connections.primaryWorkerId);
  const canManage = selected?.worker.grant.role !== "viewer";
  const board = useOptionalBoard();
  const { data: allowedBoards = [] } = clientApi.board.getAllBoards.useQuery(undefined, {
    enabled: !canManage,
    staleTime: 60_000,
  });
  let logo = <HomarrLogo size={appShellLogoHeight} />;
  let logoWithTitle = <HomarrLogoWithTitle size="md" />;
  if (board) {
    logo = <BoardLogo size={appShellLogoHeight} />;
    logoWithTitle = <BoardLogoWithTitle size="md" />;
  }
  let actions: ReactNode = <WorkerDock />;
  if (!canManage) {
    actions = null;
    if (allowedBoards.length > 1)
      actions = (
        <NativeSelect
          aria-label="Switch board"
          value={board?.name ?? allowedBoards[0]?.name ?? ""}
          data={allowedBoards.map((entry) => ({ value: entry.name, label: entry.name }))}
          onChange={(event) => router.push(`/boards/${encodeURIComponent(event.currentTarget.value)}`)}
          size="sm"
          w={{ base: 140, sm: 220 }}
        />
      );
  }
  return (
    <ConfigurableHeader
      actions={actions}
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
      canSwitchBoards={canManage}
      canAccessManagement={canManage}
      hasNavigation={hasNavigation}
      boardEditAction={boardEditAction}
      boardSettingsAction={boardSettingsAction}
    />
  );
}
