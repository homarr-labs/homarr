"use client";

import { useRef, useState } from "react";
import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useTimeout } from "@mantine/hooks";
import { IconClipboard, IconCopy } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import type { ThemeImportHandler } from "./theme-import-form";
import { ThemeImportForm } from "./theme-import-form";

export function ThemeJsonTransfer({ json, onImport }: { json: string | undefined; onImport: ThemeImportHandler }) {
  const t = useI18n("workshop.theme");
  const actions = useI18n("common.action");
  const [manualCopy, setManualCopy] = useState<string>();
  const [pasteText, setPasteText] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [pasteStatus, setPasteStatus] = useState("");
  const pasteRead = useRef(0);
  const resetCopyStatus = useTimeout(() => setCopyStatus(""), 2_500);

  const copy = async () => {
    if (!json) return;
    resetCopyStatus.clear();
    try {
      await navigator.clipboard.writeText(json);
      setCopyStatus(t("copied"));
    } catch {
      setCopyStatus("");
      setManualCopy(json);
    }
    resetCopyStatus.start();
  };

  const paste = async () => {
    const request = ++pasteRead.current;
    setPasteStatus("");
    setPasteText("");
    try {
      const text = await navigator.clipboard.readText();
      if (request !== pasteRead.current) return;
      if (text) setPasteText(text);
      else setPasteStatus(t("clipboardEmpty"));
    } catch {
      if (request !== pasteRead.current) return;
      setPasteStatus(t("manualPaste"));
    }
  };

  const closePaste = () => {
    pasteRead.current += 1;
    setPasteText(null);
  };

  return (
    <>
      <Group gap="xs">
        <Button
          type="button"
          variant="default"
          leftSection={<IconCopy size={16} />}
          onClick={() => void copy()}
          disabled={!json}
        >
          {t("copyJson")}
        </Button>
        <Button type="button" variant="default" leftSection={<IconClipboard size={16} />} onClick={() => void paste()}>
          {t("pasteJson")}
        </Button>
        <Text component="output" size="sm">
          {copyStatus}
        </Text>
      </Group>
      <Modal
        opened={manualCopy !== undefined}
        onClose={() => setManualCopy(undefined)}
        title={t("copyJson")}
        closeButtonProps={{ "aria-label": actions("close") }}
        size="lg"
      >
        <Stack gap="sm">
          <Text component="output" size="sm">
            {t("manualCopy")}
          </Text>
          <Textarea
            data-autofocus
            label={t("json")}
            value={manualCopy ?? ""}
            readOnly
            rows={10}
            onFocus={(event) => event.currentTarget.select()}
          />
        </Stack>
      </Modal>
      <Modal
        opened={pasteText !== null}
        onClose={closePaste}
        title={t("pasteJson")}
        closeButtonProps={{ "aria-label": actions("close") }}
        size="lg"
      >
        {pasteText !== null && (
          <Stack gap="xs">
            <Text component="output" size="sm">
              {pasteStatus}
            </Text>
            <ThemeImportForm
              value={pasteText}
              onChange={(value) => {
                pasteRead.current += 1;
                setPasteText(value);
                setPasteStatus("");
              }}
              onImport={(patch, options) => {
                const error = onImport(patch, options);
                if (!error) closePaste();
                return error;
              }}
              onBack={closePaste}
            />
          </Stack>
        )}
      </Modal>
    </>
  );
}
