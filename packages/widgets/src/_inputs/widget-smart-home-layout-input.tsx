"use client";

import { Button, Group, Stack, Text } from "@mantine/core";
import { IconLayoutGrid } from "@tabler/icons-react";

import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import { SmartHomeLayoutEditorModal } from "../smart-home/controls/custom-layout/editor-modal";
import { parseSmartHomeLayout } from "../smart-home/controls/custom-layout/schema";
import type { SmartHomeControlPalette } from "../smart-home/controls/types";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

/** The custom layout itself is edited in its own dialog; the settings only show a summary and the entry point. */
// The settings panel does not know the widget's pixel size; the item on the board does.
const measureItem = (itemId: string | undefined) => {
  if (!itemId || typeof document === "undefined") return undefined;
  const item = document.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(itemId)}"]`);
  if (!item || item.clientWidth === 0) return undefined;
  return { width: item.clientWidth - 8, height: item.clientHeight - 8 };
};

export const WidgetSmartHomeLayoutInput = ({ property, kind, itemId }: CommonWidgetInputProps<"smartHomeLayout">) => {
  const t = useI18n("widget.smartHome-controls.layout");
  const tInput = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const { openModal } = useModalAction(SmartHomeLayoutEditorModal);
  const layout = parseSmartHomeLayout(form.values.options[property]);
  const integrationId = form.values.integrationIds[0] ?? null;
  const elements = layout.cards.reduce((count, card) => count + card.elements.length, 0);

  return (
    <Group justify="space-between" wrap="nowrap">
      <Stack gap={0} miw={0}>
        <Text size="sm" fw={500}>
          {tInput("label")}
        </Text>
        <Text size="xs" c="dimmed">
          {integrationId ? t("summary", { cards: layout.cards.length, elements }) : t("needsIntegration")}
        </Text>
      </Stack>
      <Button
        size="xs"
        variant="light"
        leftSection={<IconLayoutGrid size={16} />}
        disabled={!integrationId}
        onClick={() => {
          if (!integrationId) return;
          openModal({
            integrationId,
            layout,
            onSave: (next) => form.setFieldValue("options", { ...form.getValues().options, [property]: next }),
            previewSize: measureItem(itemId),
            palette: form.values.options.palette as SmartHomeControlPalette | undefined,
          });
        }}
      >
        {t("edit")}
      </Button>
    </Group>
  );
};
