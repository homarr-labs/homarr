import {
  ActionIcon,
  Badge,
  Button,
  Card,
  CardSection,
  Grid,
  GridCol,
  Group,
  Menu,
  MenuTarget,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconDeviceMobile,
  IconDotsVertical,
  IconHomeFilled,
  IconLayoutDashboard,
  IconLock,
  IconWorld,
} from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { getI18n } from "@homarr/translation/server";
import { Link, UserAvatar } from "@homarr/ui";

import { BoardLayoutThumbnail } from "~/components/board/board-layout-thumbnail";
import { TourTarget } from "~/components/layout/header/tour-target";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { NoResults } from "~/components/no-results";
import { BoardCardMenuDropdown } from "./_components/board-card-menu-dropdown";
import { CreateBoardButton } from "./_components/create-board-button";

export default async function ManageBoardsPage() {
  const t = await getI18n("management.page.board");
  const session = await auth();
  const boards = await api.board.getManageOverview();
  const canCreateBoards = session?.user.permissions.includes("board-create");

  return (
    <ManagePageLayout
      title={t("title")}
      primaryAction={
        canCreateBoards ? (
          <TourTarget id="manage-boards-create">
            <CreateBoardButton />
          </TourTarget>
        ) : undefined
      }
      floatingPrimaryAction={canCreateBoards}
    >
      {boards.length === 0 && (
        <NoResults
          icon={IconLayoutDashboard}
          title={t("noResults.title")}
          description={t("noResults.description")}
          action={{ label: t("action.new.label"), href: "?create=true", hidden: !canCreateBoards }}
        />
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

interface BoardCardProps {
  board: RouterOutputs["board"]["getManageOverview"][number];
  isMenuVisible: boolean;
  labels: {
    visibility: string;
    preview: string;
    unknownCreator: string;
    home: string;
    homeTooltip: string;
    mobileHome: string;
    mobileHomeTooltip: string;
    open: string;
    settings: string;
  };
}

const BoardCard = ({ board, isMenuVisible, labels }: BoardCardProps) => {
  const VisibilityIcon = board.isPublic ? IconWorld : IconLock;

  return (
    <Card padding={0} withBorder>
      <CardSection withBorder>
        <BoardLayoutThumbnail preview={board.preview} label={labels.preview} />
      </CardSection>
      <CardSection p="sm" withBorder>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: "1 1 12rem" }}>
            <Tooltip label={labels.visibility}>
              <VisibilityIcon size={20} stroke={1.5} />
            </Tooltip>
            <Text fw={700} truncate>
              {board.name}
            </Text>
          </Group>

          <Group gap="xs" justify="flex-end" wrap="wrap" style={{ marginInlineStart: "auto" }}>
            {board.isHome && (
              <Tooltip label={labels.homeTooltip}>
                <Badge tt="none" color="yellow" variant="light" leftSection={<IconHomeFilled size=".7rem" />}>
                  {labels.home}
                </Badge>
              </Tooltip>
            )}

            {board.isMobileHome && (
              <Tooltip label={labels.mobileHomeTooltip}>
                <Badge tt="none" color="yellow" variant="light" leftSection={<IconDeviceMobile size=".7rem" />}>
                  {labels.mobileHome}
                </Badge>
              </Tooltip>
            )}

            {board.creator && (
              <Tooltip label={board.creator.name ?? labels.unknownCreator}>
                <UserAvatar user={board.creator} size="sm" />
              </Tooltip>
            )}
          </Group>
        </Group>
      </CardSection>

      <CardSection>
        <Group gap={0} wrap="nowrap">
          <Button
            style={{ border: "none", borderRadius: 0 }}
            component={Link}
            href={`/boards/${board.name}`}
            variant="default"
            h={44}
            fullWidth
          >
            {labels.open}
          </Button>
          {isMenuVisible && (
            <Menu position="bottom-end">
              <MenuTarget>
                <ActionIcon
                  style={{ borderTop: "none", borderBottom: "none", borderRight: "none", borderRadius: 0 }}
                  variant="default"
                  size={44}
                  aria-label={labels.settings}
                >
                  <IconDotsVertical size={16} stroke={1.5} />
                </ActionIcon>
              </MenuTarget>
              <BoardCardMenuDropdown board={board} />
            </Menu>
          )}
        </Group>
      </CardSection>
    </Card>
  );
};
