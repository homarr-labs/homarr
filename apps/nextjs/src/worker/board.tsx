"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Alert, AppShellMain, Button, Center, Loader, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { getLayoutIdForViewportWidth } from "@homarr/boards/layout-selection";
import { ModalProvider } from "@homarr/modals";
import { Link } from "@homarr/ui";

import { BoardProviders } from "~/app/[locale]/boards/_providers";
import type { Board } from "~/app/[locale]/boards/_types";
import { ClientBoard } from "~/app/[locale]/boards/(content)/_client";
import { CustomCss } from "~/app/[locale]/boards/(content)/_custom-css";
import { BoardContentEditAction, BoardContentSettingsAction } from "~/app/[locale]/boards/(content)/_header-actions";
import { BoardReadyProvider } from "~/app/[locale]/boards/(content)/_ready-context";
import { BoardMantineProvider } from "~/app/[locale]/boards/(content)/_theme";
import { ClientShell } from "~/components/layout/shell";

import { useWorkerBootstrap } from "./context";
import { WorkerHeader } from "./header";
import { WorkerMetadata } from "./metadata";

export function WorkerBoard({ name }: { name?: string }) {
  const router = useRouter();
  const home = clientApi.board.getHomeBoard.useQuery(undefined, { enabled: !name, retry: false });
  const named = clientApi.board.getBoardByName.useQuery({ name: name ?? "" }, { enabled: !!name, retry: false });
  const boards = clientApi.board.getAllBoards.useQuery(undefined, { enabled: !name && home.isError });
  const query = name ? named : home;
  useEffect(() => {
    if (!name && home.isError && boards.data?.[0]) router.replace(`/boards/${encodeURIComponent(boards.data[0].name)}`);
  }, [name, home.isError, boards.data, router]);

  if (query.isPending)
    return (
      <Center mih="80dvh">
        <Loader aria-label="Loading dashboard" />
      </Center>
    );
  if (query.data) return <ConnectedBoard key={query.data.id} board={query.data} />;

  return (
    <ClientShell hasNavigation={false}>
      <WorkerHeader />
      <AppShellMain>
        <Center mih="70dvh">
          <Stack align="center" maw={480}>
            <Text size="xl" fw={600}>
              Your dashboards
            </Text>
            {name && <Alert color="red">{query.error?.message ?? "This dashboard is unavailable."}</Alert>}
            {!name && <Text c="dimmed">Create your first dashboard on this worker.</Text>}
            <Button component={Link} href="/manage/boards">
              Manage dashboards
            </Button>
          </Stack>
        </Center>
      </AppShellMain>
    </ClientShell>
  );
}

function ConnectedBoard({ board }: { board: Board }) {
  const { session } = useWorkerBootstrap();
  const viewportWidth = window.innerWidth;
  const layoutId = getLayoutIdForViewportWidth(board.layouts, viewportWidth);
  const { hasChangeAccess } = constructBoardPermissions(board, session);
  return (
    <BoardProviders
      initialBoard={board}
      initialLayoutId={layoutId}
      initialViewportWidth={viewportWidth}
      canModify={hasChangeAccess}
    >
      <BoardReadyProvider>
        <BoardMantineProvider defaultColorScheme="auto">
          <ModalProvider>
            <CustomCss />
            <WorkerMetadata board={board} />
            <ClientShell hasNavigation={false}>
              <WorkerHeader
                boardEditAction={<BoardContentEditAction demoReadOnly={false} />}
                boardSettingsAction={<BoardContentSettingsAction demoReadOnly={false} />}
              />
              <AppShellMain data-advanced-focus-background>
                <ClientBoard />
              </AppShellMain>
            </ClientShell>
          </ModalProvider>
        </BoardMantineProvider>
      </BoardReadyProvider>
    </BoardProviders>
  );
}
