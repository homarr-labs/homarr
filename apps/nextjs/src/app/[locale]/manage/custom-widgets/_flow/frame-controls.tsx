"use client";
import { ActionIcon, Group, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconArrowLeft, IconPencil } from "@tabler/icons-react";
import { Link } from "@homarr/ui";
import { useI18n } from "@homarr/translation/client";
import { useCustomWidgetFormDocumentField } from "../_custom-widget-form-state";

export function WorkbenchFrameControls({ onGeneral }: { onGeneral(): void }) {
  const t = useI18n("customWidget.flow");
  const name = useCustomWidgetFormDocumentField("name");
  return (
    <Group gap="sm" wrap="nowrap" style={{ flex: "1 1 180px", minWidth: 0 }}>
      <Tooltip label={t("backToWidgets")}>
        <ActionIcon component={Link} href="/manage/custom-widgets" variant="subtle" aria-label={t("backToWidgets")}>
          <IconArrowLeft size={18} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t("general")}>
        <Text component="h1" m={0} size="sm" fw={600} style={{ minWidth: 0 }}>
          <UnstyledButton
            type="button"
            onClick={onGeneral}
            aria-label={`${name || t("workbench")} · ${t("general")}`}
            style={{ display: "flex", alignItems: "center", gap: 6, maxWidth: "100%" }}
          >
            <Text component="span" inherit truncate>
              {name || t("workbench")}
            </Text>
            <IconPencil size={13} style={{ flexShrink: 0 }} aria-hidden />
          </UnstyledButton>
        </Text>
      </Tooltip>
    </Group>
  );
}
