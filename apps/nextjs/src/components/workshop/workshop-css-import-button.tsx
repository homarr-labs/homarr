"use client";

import { useState } from "react";
import { Button, Modal } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";

import { modalSizeSelect } from "@homarr/modals";

import { WorkshopBrowser } from "./workshop-browser";

export function WorkshopCssImportButton({ onImport }: { onImport(css: string): void }) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Button type="button" variant="light" leftSection={<IconDownload size={16} />} onClick={() => setOpened(true)}>
        Import from Workshop
      </Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Import Custom CSS" size={modalSizeSelect}>
        <WorkshopBrowser
          type="customCss"
          onUseCss={(css) => {
            onImport(css);
            setOpened(false);
          }}
        />
      </Modal>
    </>
  );
}
