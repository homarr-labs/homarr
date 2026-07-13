"use client";

import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBuildingStore } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { customWidgetImportSchema } from "@homarr/validation/custom-widget";
import { validateWorkshopContent } from "@homarr/workshop";

import { WorkshopBrowser } from "./workshop-browser";

export function InstallWidgetFromWorkshopButton() {
  const t = useScopedI18n("workshop");
  const [opened, { open, close }] = useDisclosure(false);
  const utils = clientApi.useUtils();
  const mutation = clientApi.customWidget.import.useMutation({
    onSuccess: () => {
      showSuccessNotification({ title: t("title"), message: t("action.install") });
      void utils.customWidget.all.invalidate();
      void revalidatePathActionAsync("/manage/custom-widgets");
      close();
    },
    onError: (error) => showErrorNotification({ title: t("title"), message: error.message }),
  });
  return (
    <>
      <Button variant="default" leftSection={<IconBuildingStore size={16} />} onClick={open}>
        {t("action.install")}
      </Button>
      <Modal opened={opened} onClose={close} title={t("title")} size="90%" fullScreen={false}>
        <WorkshopBrowser
          initialType="widget"
          lockedType="widget"
          useLabel={t("action.install")}
          onUse={async (submission) => {
            const parsed = customWidgetImportSchema.parse(JSON.parse(submission.content));
            await mutation.mutateAsync(parsed);
          }}
        />
      </Modal>
    </>
  );
}

export function UseCssFromWorkshopButton({ onUse }: { onUse: (css: string) => void }) {
  const t = useScopedI18n("workshop");
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button variant="default" leftSection={<IconBuildingStore size={16} />} onClick={open}>
        {t("action.useCss")}
      </Button>
      <Modal opened={opened} onClose={close} title={t("title")} size="90%">
        <WorkshopBrowser
          initialType="css"
          lockedType="css"
          useLabel={t("action.useCss")}
          onUse={(submission) => {
            const validation = validateWorkshopContent("css", submission.content);
            if (!validation.success) throw new Error(validation.error);
            onUse(submission.content);
            close();
          }}
        />
      </Modal>
    </>
  );
}
