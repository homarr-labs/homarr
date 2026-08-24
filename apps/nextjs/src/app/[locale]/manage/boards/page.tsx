import { Grid, GridCol } from "@mantine/core";
import { IconLayoutDashboard } from "@tabler/icons-react";

import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { getI18n } from "@homarr/translation/server";

import { TourTarget } from "~/components/layout/header/tour-target";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { NoResults } from "~/components/no-results";
import { BoardCard } from "./_components/board-card";
import { CreateBoardButton } from "./_components/create-board-button";

export default async function ManageBoardsPage() {
  const t = await getI18n("management.page.board");
  const session = await auth();
  const boards = await api.board.getManageOverview();
  const canCreateBoards = session?.user.permissions.includes("board-create");

  return (
    <ManagePageLayout title={t("title")}>
      {canCreateBoards && (
        <TourTarget id="manage-boards-create">
          <CreateBoardButton />
        </TourTarget>
      )}
      {boards.length === 0 && (
        <NoResults icon={IconLayoutDashboard} title={t("noResults.title")} description={t("noResults.description")} />
      )}
      {boards.length > 0 && (
        <TourTarget id="manage-boards-list">
          <Grid>
            {boards.map((board) => (
              <GridCol span={{ base: 12, md: 6 }} key={board.id}>
                <BoardCard
                  board={board}
                  isMenuVisible={constructBoardPermissions(board, session).hasChangeAccess}
                  labels={{
                    visibility: t(`visibility.${board.isPublic ? "public" : "private"}`),
                    preview: t("preview.label", {
                      name: board.name,
                      count: String(board.preview?.items.length ?? 0),
                    }),
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
        </TourTarget>
      )}
    </ManagePageLayout>
  );
}
