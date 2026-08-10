"use client";

import { Button, Modal, useModalsStack } from "@mantine/core";
import type { ModalProps } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";

import { WorkshopBrowser } from "./workshop-browser";

const cssInstallModalProps = {
  size: "90%",
  styles: {
    content: { display: "flex", flexDirection: "column", height: "min(85dvh, 900px)" },
    body: { flex: 1, overflowY: "auto" },
  },
} satisfies Pick<ModalProps, "size" | "styles">;

export function WorkshopCssImportButton({ onImport }: { onImport(css: string): void }) {
  const stack = useModalsStack(["workshop", "details", "report"]);
  const detailsModal = stack.register("details");
  const reportModal = stack.register("report");

  return (
    <>
      <Button
        type="button"
        variant="light"
        leftSection={<IconDownload size={16} />}
        onClick={() => stack.open("workshop")}
      >
        Import from Workshop
      </Button>
      <Modal.Stack>
        <Modal {...stack.register("workshop")} {...cssInstallModalProps} title="Import Custom CSS">
          <WorkshopBrowser
            type="customCss"
            modalStack={{
              modalProps: cssInstallModalProps,
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
            onUseCss={(css) => {
              onImport(css);
              stack.closeAll();
            }}
          />
        </Modal>
      </Modal.Stack>
    </>
  );
}
