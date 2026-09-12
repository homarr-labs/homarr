"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Group, Select, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCheck, IconLayoutDashboard, IconPencil } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { getCustomWidgetDefaultOptions } from "@homarr/custom-widgets/core";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

/** Installation stays lightweight; the workbench loads only when explicitly opened. */
export function CustomWidgetInstallCompletion({ definitionId }: { definitionId: string }) {
  const t = useI18n("workshop.installCompletion");
  const router = useRouter();
  const utils = clientApi.useUtils();
  const { data: session } = useSession();
  const [boardId, setBoardId] = useState<string | null>(null);
  const boards = clientApi.board.getAllBoards.useQuery();
  const definition = clientApi.customWidget.get.useQuery({ id: definitionId });
  const editableBoards = (boards.data ?? []).filter(
    (board) => constructBoardPermissions(board, session ?? null).hasChangeAccess,
  );
  const selectedBoard = editableBoards.find((board) => board.id === boardId);
  const addItem = clientApi.board.addItem.useMutation({
    onSuccess: () => {
      if (!selectedBoard) return;
      void utils.board.invalidate();
      router.push(`/boards/${encodeURIComponent(selectedBoard.name)}`);
    },
  });
  const addToBoard = () => {
    if (!selectedBoard || !definition.data || addItem.isPending || addItem.isSuccess) return;
    addItem.mutate({
      boardId: selectedBoard.id,
      kind: "customApi",
      integrationIds: [],
      options: {
        definitionId,
        configuration: getCustomWidgetDefaultOptions(definition.data.options),
        configurationVersion: 1,
        refreshInterval: 30,
      },
    });
  };

  return (
    <Card withBorder radius="md" p="lg" maw={640} mx="auto" w="100%">
      <Stack gap="lg">
        <Group wrap="nowrap" align="flex-start">
          <ThemeIcon color="green" size="xl" radius="xl" variant="light">
            <IconCheck size={24} />
          </ThemeIcon>
          <Stack gap={4}>
            <Title order={2}>{t("title")}</Title>
            <Text c="dimmed" size="sm">
              {t("description")}
            </Text>
          </Stack>
        </Group>
        <Stack gap="xs">
          <Select
            data={editableBoards.map((board) => ({ value: board.id, label: board.name }))}
            label={t("board")}
            placeholder={t("chooseBoard")}
            value={boardId}
            onChange={setBoardId}
            disabled={boards.isPending || addItem.isPending || addItem.isSuccess}
            searchable
          />
          <Text size="xs" c="dimmed">
            {t("defaults")}
          </Text>
          {!boards.isPending && !boards.isError && editableBoards.length === 0 && (
            <Text size="sm" c="dimmed">
              {t("noBoards")}
            </Text>
          )}
          {(boards.error ?? definition.error ?? addItem.error) && (
            <Alert color="red">{(boards.error ?? definition.error ?? addItem.error)?.message}</Alert>
          )}
          <Button
            leftSection={<IconLayoutDashboard size={18} />}
            onClick={addToBoard}
            disabled={!selectedBoard || !definition.data || addItem.isSuccess}
            loading={addItem.isPending}
          >
            {t("addToBoard")}
          </Button>
        </Stack>
        <Group justify="space-between">
          <Button component={Link} href="/manage/custom-widgets" variant="subtle">
            {t("done")}
          </Button>
          <Button
            component={Link}
            href={`/manage/custom-widgets/edit/${definitionId}`}
            variant="default"
            leftSection={<IconPencil size={16} />}
          >
            {t("openWorkbench")}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
