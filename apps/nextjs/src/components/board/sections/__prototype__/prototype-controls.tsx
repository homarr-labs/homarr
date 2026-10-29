"use client";

import { useEffect } from "react";
import { ActionIcon, Button, Group, Paper, Popover, Switch, Text } from "@mantine/core";
import {
  IconAdjustments,
  IconChevronLeft,
  IconChevronRight,
  IconFlask,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";

import { iconSizes, zoomCompensatedSize } from "@homarr/ui";

import type { AdaptiveContainerPrototypeContextValue } from "./adaptive-container-context";
import { useAdaptiveContainerPrototype } from "./adaptive-container-context";
import {
  rotationNames,
  SmartStackActivityControls,
  SmartStackEditModal,
  stackVariants,
} from "./smart-stack-edit-modal";
import classes from "./prototype-controls.module.css";

function cycleVariant(prototype: AdaptiveContainerPrototypeContextValue, direction: number) {
  const current = stackVariants.findIndex((variant) => variant.id === prototype.variant);
  const next = stackVariants[(current + direction + stackVariants.length) % stackVariants.length];
  if (next) prototype.setVariant(next.id);
}

function rotationStatus(prototype: AdaptiveContainerPrototypeContextValue) {
  if (prototype.editorOpened || prototype.inlineEditing) return "Editing";
  if (prototype.state.focusedItemId) return "Focus hold";
  if (prototype.isHovered && prototype.settings.pauseOnHover) return "Hover hold";
  if (!prototype.state.automatic) return "Paused";
  if (prototype.settings.mode === "timed" || prototype.settings.mode === "hybrid")
    return rotationNames[prototype.settings.mode] + " · " + Math.ceil(prototype.remainingSeconds) + "s";
  return rotationNames[prototype.settings.mode];
}

export function NativeContainerPrototypeActions({ sectionId }: { sectionId: string }) {
  const prototype = useAdaptiveContainerPrototype();
  if (!prototype || prototype.sectionId !== sectionId || process.env.NODE_ENV === "production") return null;
  const enabled = prototype.settings.pageOrder.filter((id) => prototype.settings.enabledPages.includes(id));
  const position = enabled.indexOf(prototype.selectedPageId) + 1;
  let navigationVariant = "subtle";
  if (prototype.inlineEditing || prototype.editorOpened) navigationVariant = "default";
  const showTimer = prototype.settings.mode === "timed" || prototype.settings.mode === "hybrid";
  const progress = Math.max(
    0,
    Math.min(100, 100 * (1 - prototype.remainingSeconds / prototype.settings.intervalSeconds)),
  );

  return (
    <Group
      className={classes.containerToolbar}
      justify="space-between"
      gap={5}
      wrap="nowrap"
      aria-label="Smart container state navigation"
    >
      <Group gap={5} wrap="nowrap" className={classes.stateNavigation}>
        <ActionIcon
          style={zoomCompensatedSize(28)}
          variant={navigationVariant}
          aria-label="Previous container state"
          onClick={() => prototype.nextPage(-1)}
        >
          <IconChevronLeft style={iconSizes.md} />
        </ActionIcon>
        <div className={classes.currentState}>
          <Text size="xs" fw={600} truncate>
            {prototype.settings.pageTitles[prototype.selectedPageId]}
          </Text>
          <Text size="xs" c="dimmed">
            {position} / {enabled.length}
          </Text>
        </div>
        <ActionIcon
          style={zoomCompensatedSize(28)}
          variant={navigationVariant}
          aria-label="Next container state"
          onClick={() => prototype.nextPage(1)}
        >
          <IconChevronRight style={iconSizes.md} />
        </ActionIcon>
      </Group>
      <Group gap={5} wrap="nowrap">
        <Text size="xs" c="dimmed" title={prototype.selectionReason} className={classes.modeLabel}>
          {rotationStatus(prototype)}
        </Text>
        {prototype.inlineEditing && (
          <ActionIcon
            style={zoomCompensatedSize(28)}
            variant="light"
            aria-label="Edit smart container"
            title="Edit smart container"
            onClick={prototype.openEditor}
          >
            <IconAdjustments style={iconSizes.sm} />
          </ActionIcon>
        )}
      </Group>
      {showTimer && (
        <div className={classes.progressTrack} aria-hidden="true">
          <div
            style={{ width: progress + "%", background: "var(--mantine-color-" + prototype.settings.accent + "-5)" }}
          />
        </div>
      )}
    </Group>
  );
}

export function NativePrototypeControls() {
  const prototype = useAdaptiveContainerPrototype();

  useEffect(() => {
    if (!prototype || prototype.editorOpened || process.env.NODE_ENV === "production") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "input, textarea, select, [contenteditable], [role='combobox'], [role='listbox'], [role='slider'], [role='spinbutton']",
        )
      )
        return;
      event.preventDefault();
      let direction = 1;
      if (event.key === "ArrowLeft") direction = -1;
      cycleVariant(prototype, direction);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [prototype]);

  if (!prototype || process.env.NODE_ENV === "production") return null;
  const currentVariant = stackVariants.find((variant) => variant.id === prototype.variant);
  let controlLabel = "Pause";
  let controlIcon = <IconPlayerPause size={14} />;
  if (!prototype.state.automatic) {
    controlLabel = "Resume";
    controlIcon = <IconPlayerPlay size={14} />;
  }

  return (
    <>
      <SmartStackEditModal prototype={prototype} />
      <Paper component="nav" className={classes.floatingBar} aria-label="Smart stack prototype controls">
        <Group gap={7} className={classes.barMain}>
          <Group gap={3} wrap="nowrap" className={classes.variantNavigation}>
            <ActionIcon
              variant="subtle"
              aria-label="Previous design variant"
              onClick={() => cycleVariant(prototype, -1)}
            >
              <IconChevronLeft size={19} />
            </ActionIcon>
            <div className={classes.variantName}>
              <Text size="xs" c="dimmed">
                Prototype · design {prototype.variant}
              </Text>
              <Text size="sm" fw={600}>
                {currentVariant?.name}
              </Text>
            </div>
            <ActionIcon variant="subtle" aria-label="Next design variant" onClick={() => cycleVariant(prototype, 1)}>
              <IconChevronRight size={19} />
            </ActionIcon>
          </Group>
          <div className={classes.barDivider} />
          <Switch
            size="xs"
            label="Edit mode"
            checked={prototype.inlineEditing}
            onChange={(event) => prototype.setInlineEditing(event.currentTarget.checked)}
          />
          <Button size="xs" variant="light" leftSection={<IconAdjustments size={14} />} onClick={prototype.openEditor}>
            Edit stack
          </Button>
          <Popover position="top" withArrow shadow="md" width={310} zIndex={800} transitionProps={{ duration: 0 }}>
            <Popover.Target>
              <Button size="xs" variant="default" leftSection={<IconFlask size={14} />}>
                Activity
              </Button>
            </Popover.Target>
            <Popover.Dropdown>
              <SmartStackActivityControls prototype={prototype} />
            </Popover.Dropdown>
          </Popover>
          <Button
            size="xs"
            variant="default"
            leftSection={controlIcon}
            disabled={prototype.settings.mode === "manual"}
            onClick={() => {
              if (prototype.state.automatic) prototype.pause("paused by you");
              else prototype.resume();
            }}
          >
            {controlLabel}
          </Button>
          <Text className={classes.rotationStatus} size="xs" c="dimmed">
            {rotationStatus(prototype)}
          </Text>
        </Group>
      </Paper>
    </>
  );
}
