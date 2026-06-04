import { Button, Group, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { createModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

interface InnerProps {
  board: {
    id: string;
    name: string;
  };
}

export const ExportBoardModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const t = useI18n() as unknown as (key: string) => string;
  const { mutateAsync, isPending } = clientApi.board.exportBundle.useMutation();

  const handleExport = async () => {
    await mutateAsync(
      { id: innerProps.board.id },
      {
        onSuccess({ content, filename }) {
          const blob = new Blob([content], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = filename;
          anchor.click();
          URL.revokeObjectURL(url);
          actions.closeModal();
          showSuccessNotification({
            title: t("board.action.export.notification.success.title"),
            message: t("board.action.export.notification.success.message"),
          });
        },
        onError() {
          showErrorNotification({
            title: t("board.action.export.notification.error.title"),
            message: t("board.action.export.notification.error.message"),
          });
        },
      },
    );
  };

  return (
    <Stack>
      <Text size="sm" c="gray.6">
        {t("board.action.export.label")}: {innerProps.board.name}
      </Text>
      <Group justify="end">
        <Button variant="subtle" color="gray" onClick={actions.closeModal}>
          {t("common.action.cancel")}
        </Button>
        <Button loading={isPending} onClick={() => void handleExport()}>
          {t("board.action.export.label")}
        </Button>
      </Group>
    </Stack>
  );
}).withOptions({
  defaultTitle: (t) => (t as (key: string) => string)("board.action.export.label"),
});
