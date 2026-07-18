"use client";

import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBuildingStore } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { customWidgetImportSchema } from "@homarr/custom-widgets/core";
import { showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { WorkshopBrowser } from "./workshop-browser";

export function WorkshopInstallButton() {
  const t = useScopedI18n("workshop");
  const [opened, controls] = useDisclosure(false);
  const mutation = clientApi.customWidget.import.useMutation();
  const utils = clientApi.useUtils();
  return (
    <>
      <Button variant="default" leftSection={<IconBuildingStore size={16} />} onClick={controls.open}>
        {t("title")}
      </Button>
      <Modal opened={opened} onClose={controls.close} title={t("installDialog")} size="90%">
        <WorkshopBrowser
          onInstall={async (submission) => {
            const widget = customWidgetImportSchema.parse(JSON.parse(submission.content));
            await mutation.mutateAsync(widget);
            await utils.customWidget.list.invalidate();
            showSuccessNotification({
              title: t("installed"),
              message: t("installedDescription", { name: widget.name }),
            });
            controls.close();
          }}
        />
      </Modal>
    </>
  );
}
