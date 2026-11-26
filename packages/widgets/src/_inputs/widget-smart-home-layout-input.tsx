"use client";

import { Button, Group, Stack, Text } from "@mantine/core";
import { IconLayoutGrid } from "@tabler/icons-react";

import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";

import { useWidgetPreviewSize } from "../modals/preview-size-context";
import { SmartHomeLayoutEditorModal } from "../smart-home/controls/custom-layout/editor-modal";
import { getLayoutContentSize } from "../smart-home/controls/custom-layout/responsive";
import { parseSmartHomeLayout } from "../smart-home/controls/custom-layout/schema";
import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

/**
 * The widget's content size: from the edit dialog's preview (also for a widget not placed yet, and after changing
 * its size there), otherwise measured on the board.
 */
const getContentSize = (
  preview: { width: number; height: number } | null,
  itemId: string | undefined,
  hasTitle: boolean,
) => {
  if (preview) return getLayoutContentSize(preview.width, preview.height, hasTitle);
  if (!itemId || typeof document === "undefined") return undefined;
  const item = document.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(itemId)}"]`);
  if (!item || item.clientWidth === 0) return undefined;
  return getLayoutContentSize(item.clientWidth, item.clientHeight, hasTitle);
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
