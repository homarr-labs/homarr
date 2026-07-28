"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button, getDefaultZIndex, Modal, useModalsStack } from "@mantine/core";
import { IconBuildingStore } from "@tabler/icons-react";

import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { useScopedI18n } from "@homarr/translation/client";

import { CustomWidgetImportDialog } from "~/components/custom-widgets/custom-widget-import-dialog";
import { useRuntimeFeature } from "~/hooks/use-runtime-feature";
import { WorkshopBrowser } from "./workshop-browser";

interface WorkshopInstallButtonProps {
  children?: ReactNode;
  fullWidth?: boolean;
}

export function WorkshopInstallButton({ children, fullWidth }: WorkshopInstallButtonProps = {}) {
  const workshopEnabled = useRuntimeFeature("workshop");
  const t = useScopedI18n("workshop");
  const stack = useModalsStack(["workshop", "review"]);
  const [pendingWidget, setPendingWidget] = useState<HomarrCustomWidgetV2 | null>(null);
  const zIndex = getDefaultZIndex("modal") + 10;

  const closeReview = () => {
    stack.close("review");
    setPendingWidget(null);
  };

  if (!workshopEnabled) return null;

  return (
    <>
      <Button
        variant="default"
        leftSection={<IconBuildingStore size={16} />}
        onClick={() => stack.open("workshop")}
        fullWidth={fullWidth}
      >
        {children ?? t("title")}
      </Button>
      <Modal.Stack>
        <Modal {...stack.register("workshop")} title={t("installDialog")} size="90%" zIndex={zIndex}>
          <WorkshopBrowser
            onInstall={async (widget) => {
              setPendingWidget(widget);
              stack.open("review");
            }}
          />
        </Modal>
        <CustomWidgetImportDialog
          {...stack.register("review")}
          widget={pendingWidget}
          zIndex={zIndex + 1}
          onClose={closeReview}
          onImported={() => {
            stack.closeAll();
            setPendingWidget(null);
          }}
        />
      </Modal.Stack>
    </>
  );
}
