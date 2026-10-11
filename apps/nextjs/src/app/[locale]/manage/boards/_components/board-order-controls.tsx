"use client";

import { useRouter } from "next/navigation";
import { ActionIcon, Grid, GridCol, Group, Text } from "@mantine/core";
import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

export const BoardOrderControls = ({ boards }: { boards: RouterOutputs["board"]["getManageOverview"] }) => {
  const router = useRouter();
  const utils = clientApi.useUtils();
  const t = useI18n("management.page.board.order");
  const mutation = clientApi.serverSettings.updateBoardSettings.useMutation({
    onSuccess: async () => {
      await utils.board.getManageOverview.invalidate();
      router.refresh();
    },
    onError: (error) => showErrorNotification({ title: t("error"), message: error.message }),
  });

  const move = (index: number, offset: number) => {
    const boardOrder = boards.map((board) => board.id);
    const destination = index + offset;
    const sourceId = boardOrder[index];
    const destinationId = boardOrder[destination];
    if (!sourceId || !destinationId) return;
    [boardOrder[index], boardOrder[destination]] = [destinationId, sourceId];
    mutation.mutate({ boardOrder });
  };

  return (
    <>
      <Text size="sm" c="dimmed">
        {t("description")}
      </Text>
      <Grid>
        {boards.map((board, index) => (
          <GridCol span={{ base: 12, md: 6 }} key={board.id}>
            <Group justify="space-between" wrap="nowrap">
              <Text truncate>
                {index + 1}. {board.name}
              </Text>
              <Group gap="xs" wrap="nowrap">
                <ActionIcon
                  variant="default"
                  size={44}
                  aria-label={t("up", { name: board.name })}
                  disabled={index === 0 || mutation.isPending}
                  onClick={() => move(index, -1)}
                >
                  <IconArrowUp size={18} />
                </ActionIcon>
                <ActionIcon
                  variant="default"
                  size={44}
                  aria-label={t("down", { name: board.name })}
                  disabled={index === boards.length - 1 || mutation.isPending}
                  onClick={() => move(index, 1)}
                >
                  <IconArrowDown size={18} />
                </ActionIcon>
              </Group>
            </Group>
          </GridCol>
        ))}
      </Grid>
    </>
  );
};
