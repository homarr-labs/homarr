import { useState } from "react";
import { Alert, Button, FileInput, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconFileUpload } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { createModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

export const ImportBoardJsonModal = createModal(({ actions }) => {
  const t = useScopedI18n("management.page.board.action.importJson");
  const tCommon = useScopedI18n("common");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const { mutateAsync, isPending } = clientApi.backup.importBoard.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/manage/boards");
    },
  });

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    setFileError(null);

    if (selectedFile && !selectedFile.name.endsWith(".json")) {
      setFileError(t("form.file.invalidError"));
    }
  };

  const handleSubmitAsync = async () => {
    if (!file) return;

    try {
      const content = await file.text();

      // Basic JSON validation
      try {
        JSON.parse(content);
      } catch {
        setFileError(t("form.file.invalidJsonError"));
        return;
      }

      const result = await mutateAsync({ jsonContent: content });

      if (result.success) {
        actions.closeModal();
        showSuccessNotification({
          title: t("notification.success.title"),
          message: `${result.boardName} - ${t("notification.success.message")}`,
        });
      } else {
        showErrorNotification({
          title: t("notification.error.title"),
          message: result.errors.join(", ") || t("notification.error.message"),
        });
      }
    } catch {
      showErrorNotification({
        title: t("notification.error.title"),
        message: t("notification.error.message"),
      });
    }
  };

  return (
    <Stack>
      <Text size="sm" c="gray.6">
        {t("description")}
      </Text>

      <Alert icon={<IconAlertTriangle size={16} />} color="yellow" variant="light">
        {t("warning")}
      </Alert>

      <FileInput
        rightSection={<IconFileUpload size={16} />}
        withAsterisk
        accept="application/json"
        value={file}
        onChange={handleFileChange}
        error={fileError}
        label={t("form.file.label")}
        placeholder={t("form.file.placeholder")}
      />

      <Group justify="end">
        <Button variant="subtle" color="gray" onClick={actions.closeModal}>
          {tCommon("action.cancel")}
        </Button>
        <Button onClick={handleSubmitAsync} loading={isPending} disabled={!file || Boolean(fileError)}>
          {tCommon("action.import")}
        </Button>
      </Group>
    </Stack>
  );
}).withOptions({
  defaultTitle: (t) => t("management.page.board.action.importJson.label"),
  size: "md",
});
