"use client";

import { Button, Group, Stack, Text } from "@mantine/core";
import { IconLayoutGrid } from "@tabler/icons-react";

import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import { useWidgetPreviewSize } from "../modals/preview-size-context";
import { SmartHomeLayoutEditorModal } from "../smart-home/controls/custom-layout/editor-modal";
import { parseSmartHomeLayout } from "../smart-home/controls/custom-layout/schema";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

// The widget's content sits inside the item's padding, below the title when it has one.
const ITEM_INSET = 8;
const TITLE_HEIGHT = 28;

/**
 * The widget's content size: from the edit dialog's preview (also for a widget not placed yet, and after changing
 * its size there), otherwise measured on the board.
 */
const getContentSize = (
  preview: { width: number; height: number } | null,
  itemId: string | undefined,
  hasTitle: boolean,
) => {
  const titleHeight = hasTitle ? TITLE_HEIGHT : 0;
  if (preview) return { width: preview.width - ITEM_INSET, height: preview.height - ITEM_INSET - titleHeight };
  if (!itemId || typeof document === "undefined") return undefined;
  const item = document.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(itemId)}"]`);
  if (!item || item.clientWidth === 0) return undefined;
  return { width: item.clientWidth - ITEM_INSET, height: item.clientHeight - ITEM_INSET - titleHeight };
};

/** The custom layout itself is edited in its own dialog; the settings only show a summary and the entry point. */

export const WidgetSmartHomeLayoutInput = ({ property, kind, itemId }: CommonWidgetInputProps<"smartHomeLayout">) => {
  const t = useI18n("widget.smartHome-controls.layout");
  const tInput = useWidgetInputTranslation(kind, property);
  const form = useFormContext();
  const { openModal } = useModalAction(SmartHomeLayoutEditorModal);
  const previewSize = useWidgetPreviewSize();
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
            previewSize: getContentSize(
              previewSize,
              itemId,
              typeof form.values.options.title === "string" && form.values.options.title.trim() !== "",
            ),
          });
        }}
      >
        {t("edit")}
      </Button>
    </Group>
  );
};
