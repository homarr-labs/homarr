import { notFound } from "next/navigation";
import { Container, Stack, Title } from "@mantine/core";
import { TRPCError } from "@trpc/server";

import { api } from "@homarr/api/server";
import { capitalize } from "@homarr/common";
import { db } from "@homarr/db";
import { getServerSettingByKeyAsync } from "@homarr/db/queries";
import { getI18n } from "@homarr/translation/server";

import { getBoardPermissionsAsync } from "~/components/board/permissions/server";
import { BoardSettingsForm } from "./_settings-form";

interface Props {
  params: Promise<{
    name: string;
  }>;
}

const getBoardAndPermissionsAsync = async (params: Awaited<Props["params"]>) => {
  try {
    const board = await api.board.getBoardByName({ name: params.name });
    const { hasFullAccess } = await getBoardPermissionsAsync(board);
    const permissions = hasFullAccess
      ? await api.board.getBoardPermissions({ id: board.id })
      : {
          users: [],
          groups: [],
          inherited: [],
        };

    return { board, permissions };
  } catch (error) {
    // Ignore not found errors and redirect to 404
    // error is already logged in _layout-creator.tsx
    if (error instanceof TRPCError && (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")) {
      notFound();
    }

    throw error;
  }
};

export default async function BoardSettingsPage(props: Props) {
  const params = await props.params;
  const { board, permissions } = await getBoardAndPermissionsAsync(params);
  const boardSettings = await getServerSettingByKeyAsync(db, "board");
  const { hasFullAccess, hasChangeAccess } = await getBoardPermissionsAsync(board);
  const t = await getI18n("board.setting");

  if (!hasChangeAccess) {
    notFound();
  }

  return (
    <Container size="xl" px={{ base: "md", md: "xl" }}>
      <Stack>
        <Title>{t("title", { boardName: capitalize(board.name) })}</Title>
        <BoardSettingsForm
          board={board}
          permissions={permissions}
          hasFullAccess={hasFullAccess}
          hideVisibility={boardSettings.homeBoardId === board.id || boardSettings.mobileHomeBoardId === board.id}
        />
      </Stack>
    </Container>
  );
}
