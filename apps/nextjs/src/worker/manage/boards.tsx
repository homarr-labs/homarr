"use client";

import { Container, Grid, GridCol, Stack, Title } from "@mantine/core";
import { IconLayoutDashboard } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { BoardProvider } from "@homarr/boards/context";
import { EditModeProvider } from "@homarr/boards/edit-mode";
import { capitalize } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import { BoardSettingsForm } from "~/app/[locale]/boards/[name]/settings/_settings-form";
import { BoardCard } from "~/app/[locale]/manage/boards/_components/board-card";
import { CreateBoardButton } from "~/app/[locale]/manage/boards/_components/create-board-button";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { NoResults } from "~/components/no-results";

import { WorkerQuery, WorkerQueryStatus } from "./query-state";

export function WorkerBoardsRoute() {
  const query = clientApi.board.getManageOverview.useQuery();
  const { data: session } = useSession();
  const t = useI18n("management.page.board");
  return (
    <WorkerQuery query={query}>
      {(boards) => (
        <ManagePageLayout title={t("title")}>
          {session?.user.permissions.includes("board-create") && <CreateBoardButton />}
          {boards.length === 0 && (
            <NoResults
              icon={IconLayoutDashboard}
              title={t("noResults.title")}
              description={t("noResults.description")}
            />
          )}
          <Grid>
            {boards.map((board) => (
              <GridCol span={{ base: 12, md: 6 }} key={board.id}>
                <BoardCard
                  board={board}
                  isMenuVisible={constructBoardPermissions(board, session).hasChangeAccess}
                  labels={{
                    visibility: t(`visibility.${board.isPublic ? "public" : "private"}`),
                    preview: t("preview.label", { name: board.name, count: String(board.preview?.items.length ?? 0) }),
                    unknownCreator: t("preview.unknownCreator"),
                    home: t("action.setHomeBoard.badge.label"),
                    homeTooltip: t("action.setHomeBoard.badge.tooltip"),
                    mobileHome: t("action.setMobileHomeBoard.badge.label"),
                    mobileHomeTooltip: t("action.setMobileHomeBoard.badge.tooltip"),
                    open: t("action.open.label"),
                    settings: t("action.settings.label"),
                  }}
                />
              </GridCol>
            ))}
          </Grid>
        </ManagePageLayout>
      )}
    </WorkerQuery>
  );
}

export function WorkerBoardSettings({ name }: { name: string }) {
  const query = clientApi.board.getBoardByName.useQuery({ name });
  const { data: session } = useSession();
  const board = query.data;
  const access = board && constructBoardPermissions(board, session);
  const permissionsQuery = clientApi.board.getBoardPermissions.useQuery(
    { id: board?.id ?? "" },
    { enabled: access?.hasFullAccess ?? false },
  );
  const settingsQuery = clientApi.frontend.settings.useQuery();
  const t = useI18n("board.setting");
  if (!board || !settingsQuery.data || (access?.hasFullAccess && !permissionsQuery.data))
    return <WorkerQueryStatus queries={[query, settingsQuery, ...(access?.hasFullAccess ? [permissionsQuery] : [])]} />;
  if (!access?.hasChangeAccess)
    return <NoResults icon={IconLayoutDashboard} title={t("title", { boardName: capitalize(board.name) })} />;
  const layoutId = board.layouts[0]?.id ?? "";
  let viewportWidth = 0;
  if (typeof window !== "undefined") viewportWidth = window.innerWidth;
  return (
    <BoardProvider initialBoard={board} initialLayoutId={layoutId} initialViewportWidth={viewportWidth}>
      <EditModeProvider>
        <Container size="xl" px={{ base: "md", md: "xl" }}>
          <Stack>
            <Title>{t("title", { boardName: capitalize(board.name) })}</Title>
            <BoardSettingsForm
              board={board}
              permissions={permissionsQuery.data ?? { users: [], groups: [], inherited: [] }}
              hasFullAccess={access.hasFullAccess}
              hideVisibility={
                settingsQuery.data.board.homeBoardId === board.id ||
                settingsQuery.data.board.mobileHomeBoardId === board.id
              }
            />
          </Stack>
        </Container>
      </EditModeProvider>
    </BoardProvider>
  );
}
