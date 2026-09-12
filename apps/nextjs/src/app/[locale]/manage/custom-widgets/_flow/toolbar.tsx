"use client";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { ActionIcon, Button, Group, Menu, Tooltip } from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconDots,
  IconForms,
  IconMaximize,
  IconMinimize,
  IconPlus,
  IconRestore,
  IconSparkles,
} from "@tabler/icons-react";
import { useI18n } from "@homarr/translation/client";
import { useConfirmModal } from "@homarr/modals";
import { useCustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import classes from "./workbench.module.css";
import { WorkbenchFrameControls } from "./frame-controls";
const WorkbenchWorkshop = dynamic(() => import("./workshop").then((module) => module.WorkbenchWorkshop), {
  ssr: false,
});
export function WorkbenchToolbar({
  actions,
  definitionId,
  mode,
  setMode,
  libraryOpened,
  onToggleLibrary,
  onAssistant,
  onGeneral,
  fullscreen,
  onToggleFullscreen,
}: {
  actions: ReactNode;
  definitionId?: string;
  mode: string;
  setMode(value: string): void;
  libraryOpened: boolean;
  onToggleLibrary(): void;
  onAssistant(): void;
  onGeneral(): void;
  fullscreen: boolean;
  onToggleFullscreen(): void;
}) {
  const t = useI18n("customWidget.flow");
  const store = useCustomWidgetFormDocumentStore();
  useSyncExternalStore(store.subscribeEditor, store.getRevision, store.getRevision);
  const { openConfirmModal } = useConfirmModal();
  const reset = () => openConfirmModal({ title: t("reset"), children: t("resetDescription"), onConfirm: store.reset });
  let viewLabel = t("form");
  let nextMode = "form";
  if (mode !== "flow") {
    viewLabel = t("canvas");
    nextMode = "flow";
  }
  let fullscreenLabel = t("enterFullscreen");
  let FullscreenIcon = IconMaximize;
  if (fullscreen) {
    fullscreenLabel = t("exitFullscreen");
    FullscreenIcon = IconMinimize;
  }
  return (
    <Group className={classes.toolbar} justify="space-between" gap="sm">
      <WorkbenchFrameControls onGeneral={onGeneral} />
      <Group gap={6}>
        <Tooltip label={t("undo")}>
          <ActionIcon
            type="button"
            variant="default"
            aria-label={t("undo")}
            disabled={!store.canUndo()}
            onClick={store.undo}
          >
            <IconArrowBackUp size={17} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t("redo")}>
          <ActionIcon
            type="button"
            variant="default"
            aria-label={t("redo")}
            disabled={!store.canRedo()}
            onClick={store.redo}
          >
            <IconArrowForwardUp size={17} />
          </ActionIcon>
        </Tooltip>
        <Button
          size="compact-sm"
          variant="default"
          leftSection={<IconPlus size={16} />}
          aria-expanded={libraryOpened}
          data-workbench-library-toggle
          onClick={onToggleLibrary}
        >
          {t("add")}
        </Button>
        <Button size="compact-sm" variant="subtle" leftSection={<IconSparkles size={16} />} onClick={onAssistant}>
          {t("assistant")}
        </Button>
        <WorkbenchWorkshop definitionId={definitionId} />
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon type="button" variant="subtle" aria-label={t("moreOptions")}>
              <IconDots size={18} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconForms size={16} />} onClick={() => setMode(nextMode)}>
              {viewLabel}
            </Menu.Item>
            <Menu.Item leftSection={<FullscreenIcon size={16} />} onClick={onToggleFullscreen}>
              {fullscreenLabel}
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item leftSection={<IconRestore size={16} />} onClick={reset}>
              {t("reset")}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      {actions}
    </Group>
  );
}
