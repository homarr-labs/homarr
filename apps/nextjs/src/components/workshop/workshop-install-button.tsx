"use client";

import { useState } from "react";
import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBuildingStore } from "@tabler/icons-react";

import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { useScopedI18n } from "@homarr/translation/client";

import { CustomWidgetImportDialog } from "~/components/custom-widgets/custom-widget-import-dialog";
import { WorkshopBrowser } from "./workshop-browser";

export function WorkshopInstallButton() {
  const t = useScopedI18n("workshop");
  const [opened, controls] = useDisclosure(false);
  const [reviewOpened, reviewControls] = useDisclosure(false);
  const [pendingWidget, setPendingWidget] = useState<HomarrCustomWidgetV2 | null>(null);
  return (
    <>
      <Button variant="default" leftSection={<IconBuildingStore size={16} />} onClick={controls.open}>
        {t("title")}
      </Button>
      <Modal opened={opened} onClose={controls.close} title={t("installDialog")} size="90%">
        <WorkshopBrowser
          onInstall={async (widget) => {
            setPendingWidget(widget);
            reviewControls.open();
          }}
        />
      </Modal>
      <CustomWidgetImportDialog
        opened={reviewOpened}
        widget={pendingWidget}
        onClose={() => {
          reviewControls.close();
          setPendingWidget(null);
        }}
        onImported={controls.close}
      />
    </>
  );
}
