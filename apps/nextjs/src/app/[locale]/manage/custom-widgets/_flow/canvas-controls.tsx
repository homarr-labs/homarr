"use client";
import { Controls } from "@xyflow/react";
import { Button, Group, Menu } from "@mantine/core";
import { IconArrowBackUp, IconChevronDown, IconFocus2, IconLayoutDistributeHorizontal } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import classes from "./workbench.module.css";
export function CanvasControls({
  arranging,
  selection,
  branch,
  arrange,
  focus,
  fit,
}: {
  arranging: boolean;
  selection: string[];
  branch: boolean;
  arrange(selectionOnly?: boolean): void;
  focus(related: boolean): void;
  fit(): void;
}) {
  const t = useI18n("customWidget.flow");
  return (
    <Group className={classes.canvasTools} gap={4} p="xs">
      <Menu position="bottom-start" withinPortal>
        <Menu.Target>
          <Button size="compact-sm" variant="default" rightSection={<IconChevronDown size={14} />} loading={arranging}>
            {t("canvasOptions")}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            leftSection={<IconLayoutDistributeHorizontal size={16} />}
            disabled={arranging}
            onClick={() => arrange()}
          >
            {t("arrange")}
          </Menu.Item>
          <Menu.Item disabled={!selection.length || arranging} onClick={() => arrange(true)}>
            {t("arrangeSelection")}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item leftSection={<IconFocus2 size={16} />} onClick={fit}>
            {t("fit")}
          </Menu.Item>
          {selection.length > 0 && <Menu.Item onClick={() => focus(false)}>{t("focus")}</Menu.Item>}
          {selection.length > 0 && <Menu.Item onClick={() => focus(true)}>{t("focusBranch")}</Menu.Item>}
        </Menu.Dropdown>
      </Menu>
      {branch && (
        <Button size="compact-sm" variant="default" leftSection={<IconArrowBackUp size={14} />} onClick={fit}>
          {t("allNodes")}
        </Button>
      )}
    </Group>
  );
}
export function CanvasViewportControls() {
  const t = useI18n("customWidget.flow");
  return (
    <fieldset aria-label={t("canvasControls")} style={{ border: 0, margin: 0, padding: 0, minInlineSize: 0 }}>
      <Controls showInteractive={false} aria-label="" />
    </fieldset>
  );
}
