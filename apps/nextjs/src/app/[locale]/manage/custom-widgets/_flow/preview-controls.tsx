"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button, CloseButton, Group, Popover, SegmentedControl, Stack, Switch, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import { CustomWidgetPreviewSizeControl } from "../_custom-widget-preview-size-control";
import type { PreviewFixture, PreviewPanelProps } from "./preview-panel-types";

export function WorkbenchPreviewControls({
  size,
  onSizeChange,
  inspect,
  onInspectChange,
  fixture,
  onFixtureChange,
  disabled,
}: Pick<PreviewPanelProps, "size" | "onSizeChange"> & {
  inspect: boolean;
  onInspectChange(value: boolean): void;
  fixture: PreviewFixture;
  onFixtureChange(value: PreviewFixture): void;
  disabled: boolean;
}) {
  const t = useI18n("customWidget.workbench.preview");
  const flowT = useI18n("customWidget.flow");
  return (
    <Group gap="xs" justify="space-between" className="nodrag nopan nowheel">
      <CustomWidgetPreviewSizeControl value={size} onChange={onSizeChange} />
      <Switch
        size="xs"
        label={flowT("inspectPreview")}
        checked={inspect}
        onChange={(event) => onInspectChange(event.currentTarget.checked)}
      />
      <SegmentedControl
        size="xs"
        value={fixture}
        disabled={disabled}
        onChange={(value) => onFixtureChange(value as PreviewFixture)}
        data={(["live", "loading", "empty", "error"] as const).map((value) => ({
          value,
          label: t(`fixture.${value}`),
        }))}
      />
    </Group>
  );
}

export function WorkbenchPreviewTools({ children, revealVersion }: { children: ReactNode; revealVersion: number }) {
  const t = useI18n("customWidget.flow");
  const common = useI18n("common.action");
  const [opened, setOpened] = useState(false);
  const [returnFocus, setReturnFocus] = useState(true);
  const changeOpened = (value: boolean) => {
    setReturnFocus(true);
    setOpened(value);
  };
  useEffect(() => {
    if (revealVersion > 0) {
      setReturnFocus(true);
      setOpened(true);
    }
  }, [revealVersion]);
  useEffect(() => {
    if (!opened) return;
    const followNavigation = () => {
      setReturnFocus(false);
      setOpened(false);
    };
    window.addEventListener("homarr:widget-code-insert", followNavigation);
    window.addEventListener("homarr:widget-request-inspect", followNavigation);
    return () => {
      window.removeEventListener("homarr:widget-code-insert", followNavigation);
      window.removeEventListener("homarr:widget-request-inspect", followNavigation);
    };
  }, [opened]);
  return (
    <Popover
      opened={opened}
      onChange={changeOpened}
      onDismiss={() => changeOpened(false)}
      withinPortal
      trapFocus
      returnFocus={returnFocus}
      position="bottom-end"
      width="min(680px, calc(100vw - 24px))"
      shadow="lg"
      zIndex={500}
    >
      <Popover.Target>
        <Button
          type="button"
          size="compact-xs"
          variant="default"
          className="nodrag nopan"
          leftSection={<IconAdjustmentsHorizontal size={14} />}
          onClick={(event) => {
            event.stopPropagation();
            changeOpened(!opened);
          }}
        >
          {t("previewControls")}
        </Button>
      </Popover.Target>
      <Popover.Dropdown
        className="nodrag nopan nowheel"
        p="sm"
        aria-label={t("previewControls")}
        style={{ maxHeight: "min(680px, calc(100dvh - 96px))", overflow: "auto" }}
        onKeyDown={(event) => {
          if (event.key !== "Tab") event.stopPropagation();
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <Stack gap="sm">
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" fw={600}>
              {t("previewControls")}
            </Text>
            <CloseButton data-autofocus aria-label={common("close")} onClick={() => changeOpened(false)} />
          </Group>
          {children}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
