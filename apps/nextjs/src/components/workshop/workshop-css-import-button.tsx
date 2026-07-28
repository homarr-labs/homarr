"use client";

import { useState } from "react";
import { Button, Modal } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";

import { WorkshopBrowser } from "./workshop-browser";
import { useRuntimeFeature } from "~/hooks/use-runtime-feature";

export function WorkshopCssImportButton({ onImport }: { onImport(css: string): void }) {
  const workshopEnabled = useRuntimeFeature("workshop");
  const [opened, setOpened] = useState(false);

  if (!workshopEnabled) return null;

  return (
    <>
      <Button type="button" variant="light" leftSection={<IconDownload size={16} />} onClick={() => setOpened(true)}>
        Import from Workshop
      </Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Import Custom CSS" size="xl">
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
