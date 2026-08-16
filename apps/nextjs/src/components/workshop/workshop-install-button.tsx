"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button, Modal, useModalsStack } from "@mantine/core";
import type { ModalProps } from "@mantine/core";
import { IconBuildingStore } from "@tabler/icons-react";

import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { useScopedI18n } from "@homarr/translation/client";

import { CustomWidgetImportDialog } from "~/components/custom-widgets/custom-widget-import-dialog";
import { WorkshopBrowser } from "./workshop-browser";

interface WorkshopInstallButtonProps {
  children?: ReactNode;
  fullWidth?: boolean;
}

const installFlowModalProps = {
  size: "90%",
  styles: {
    content: { display: "flex", flexDirection: "column", height: "min(85dvh, 900px)" },
    body: { flex: 1, overflowY: "auto" },
  },
} satisfies Pick<ModalProps, "size" | "styles">;

const installReviewModalProps = {
  size: "90%",
  styles: {
    content: { display: "flex", flexDirection: "column", height: "min(85dvh, 900px)" },
    body: {
      display: "flex",
      flex: 1,
      flexDirection: "column",
      minHeight: 0,
      overflow: "hidden",
      padding: 0,
    },
  },
} satisfies Pick<ModalProps, "size" | "styles">;

export function WorkshopInstallButton({ children, fullWidth }: WorkshopInstallButtonProps = {}) {
  const t = useScopedI18n("workshop");
  const stack = useModalsStack(["workshop", "details", "report", "review"]);
  const [pendingWidget, setPendingWidget] = useState<HomarrCustomWidgetV2 | null>(null);
  const detailsModal = stack.register("details");
  const reportModal = stack.register("report");

  const closeReview = () => {
    stack.close("review");
    setPendingWidget(null);
  };

  return (
    <>
      <Button
        variant="default"
        leftSection={<IconBuildingStore size={16} />}
        onClick={() => stack.open("workshop")}
        fullWidth={fullWidth}
      >
        {children ?? t("importFromWorkshop")}
      </Button>
      <Modal.Stack>
        <Modal {...stack.register("workshop")} {...installFlowModalProps} title={t("installDialog")}>
          <WorkshopBrowser
            modalStack={{
              modalProps: installFlowModalProps,
              details: {
                opened: detailsModal.opened,
                stackId: detailsModal.stackId,
                open: () => stack.open("details"),
                close: () => stack.close("details"),
              },
              report: {
                opened: reportModal.opened,
                stackId: reportModal.stackId,
                open: () => stack.open("report"),
                close: () => stack.close("report"),
              },
            }}
            onInstall={async (widget) => {
              setPendingWidget(widget);
              stack.open("review");
            }}
          />
        </Modal>
        <CustomWidgetImportDialog
          {...stack.register("review")}
          widget={pendingWidget}
          modalProps={installReviewModalProps}
          labels={{
            title: t("confirmInstallTitle"),
            description: t("confirmInstallDescription"),
            cancel: t("backToWidget"),
            confirm: t("install"),
          }}
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
