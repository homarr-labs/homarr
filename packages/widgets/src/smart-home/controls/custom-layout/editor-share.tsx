"use client";

import { useState } from "react";
import { Button, CopyButton, Group, Popover, Stack, Text, Textarea } from "@mantine/core";
import { IconCheck, IconCopy, IconDownload, IconShare } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { isValidArrangement } from "./editor-grid";
import { smartHomeLayoutSchema } from "./schema";
import type { SmartHomeLayout } from "./schema";

/**
 * Sharing a layout: copy or download it, or paste one. A pasted layout reaches the editor only when it can be
 * edited: valid, not empty, and with nothing on top of anything.
 */
export function SharePopover({
  draft,
  onImport,
}: {
  draft: SmartHomeLayout;
  onImport: (layout: SmartHomeLayout) => void;
}) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const [shareOpened, setShareOpened] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState(false);

  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "smart-home-layout.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importLayout = () => {
    let parsed: SmartHomeLayout;
    try {
      parsed = smartHomeLayoutSchema.parse(JSON.parse(importText));
    } catch {
      setImportError(true);
      return;
    }
    // Empty, or cards on top of each other, or elements outside their card: such a layout cannot be edited.
    if ((parsed.cards.length === 0 && !parsed.templates?.length) || !isValidArrangement(parsed.cards)) {
      setImportError(true);
      return;
    }
    onImport(parsed);
    setShareOpened(false);
    setImportText("");
    setImportError(false);
  };

  return (
    <Popover
      opened={shareOpened}
      onChange={setShareOpened}
      position="bottom-end"
      width="min(340px, calc(100vw - 16px))"
      shadow="md"
      trapFocus
      returnFocus
    >
      <Popover.Target>
        <Button
          size="sm"
          variant="default"
          leftSection={<IconShare size={16} />}
          onClick={() => setShareOpened((opened) => !opened)}
        >
          {t("share")}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Text size="xs" c="dimmed">
            {t("shareHint")}
          </Text>
          <Group gap="xs" grow>
            <CopyButton value={JSON.stringify(draft)}>
              {({ copied, copy }) => (
                <Button
                  size="sm"
                  variant="light"
                  color={copied ? "teal" : undefined}
                  leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                  onClick={copy}
                >
                  {copied ? t("copied") : t("copyLayout")}
                </Button>
              )}
            </CopyButton>
            <Button size="sm" variant="light" leftSection={<IconDownload size={16} />} onClick={download}>
              {t("download")}
            </Button>
          </Group>
          <Textarea
            size="sm"
            data-autofocus
            label={t("importLayout")}
            placeholder={t("importPlaceholder")}
            autosize
            minRows={2}
            maxRows={6}
            value={importText}
            error={importError ? t("importInvalid") : undefined}
            onChange={(event) => {
              setImportText(event.currentTarget.value);
              setImportError(false);
            }}
          />
          <Button size="sm" disabled={importText.trim() === ""} onClick={importLayout}>
            {t("importApply")}
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
