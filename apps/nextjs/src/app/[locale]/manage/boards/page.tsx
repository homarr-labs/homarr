import Link from "next/link";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { getScopedI18n } from "@homarr/translation/server";
import {
  ActionIcon,
  Button,
  Card,
  CardSection,
  Grid,
  GridCol,
  Group,
  IconDotsVertical,
  IconLock,
  IconWorld,
  Menu,
  MenuTarget,
  Text,
  Title,
  Tooltip,
} from "@homarr/ui";

import { getBoardPermissions } from "~/components/board/permissions/server";
import { BoardCardMenuDropdown } from "./_components/board-card-menu-dropdown";
import { CreateBoardButton } from "./_components/create-board-button";

export default async function ManageBoardsPage() {
  const t = await getScopedI18n("management.page.board");

  const boards = await api.board.getAll();

  return (
    <>
      <Group justify="space-between">
        <Title mb="md">{t("title")}</Title>
        <CreateBoardButton boardNames={boards.map((board) => board.name)} />
      </Group>

      <Grid>
        {boards.map((board) => (
          <GridCol span={{ xs: 12, md: 4 }} key={board.id}>
            <BoardCard board={board} />
          </GridCol>
        ))}
      </Grid>
    </>
  );
}

interface BoardCardProps {
  board: RouterOutputs["board"]["getAll"][number];
}

const BoardCard = async ({ board }: BoardCardProps) => {
  const t = await getScopedI18n("management.page.board");
  const { hasChangeAccess: isMenuVisible } = await getBoardPermissions(board);
  const visibility = board.isPublic ? "public" : "private";
  const VisibilityIcon = board.isPublic ? IconWorld : IconLock;

  return (
    <Card>
      <CardSection p="sm" withBorder>
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <Tooltip label={t(`visibility.${visibility}`)}>
              <VisibilityIcon size={20} stroke={1.5} />
            </Tooltip>
            <Text fw="bolder" tt="uppercase">
              {board.name}
            </Text>
          </Group>
        </Group>
      </CardSection>

      <CardSection p="sm">
        <Group wrap="nowrap">
          <Button
            component={Link}
            href={`/boards/${board.name}`}
            variant="default"
            fullWidth
          >
            {t("action.open.label")}
          </Button>
          {isMenuVisible && (
            <Menu position="bottom-end">
              <MenuTarget>
                <ActionIcon variant="default" size="lg">
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
