"use client";

import { useEffect } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  Group,
  Paper,
  Popover,
  Select,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { IconAdjustments, IconArrowLeft, IconArrowRight, IconFlask, IconPlayerPlay } from "@tabler/icons-react";

import { useEditMode } from "@homarr/boards/edit-mode";

import type {
  AdaptiveContainerPrototypeContextValue,
  PrototypeProbeStatus,
  PrototypeVariant,
} from "./adaptive-container-context";
import { useAdaptiveContainerPrototype } from "./adaptive-container-context";
import classes from "./prototype-controls.module.css";

// Three throwaway variants of actual board containers, on the existing board route via ?variant=A/B/C.
const variants: PrototypeVariant[] = ["A", "B", "C"];
const variantNames = { A: "Hide idle", B: "Smart stack", C: "Fit content" };
const variantDescriptions = {
  A: "The real board grid removes confirmed-idle media items and moves the configured Stats item up inside a fixed container.",
  B: "One real widget is visible at a time. Page manually, then explicitly resume activity-based selection.",
  C: "The real media item uses bounded content rows, with the configured 9 × 1 Stats item directly below. Optional outer shrink reclaims board space.",
};
const observationOptions = [
  { value: "playing", label: "Playing · 1 session" },
  { value: "busy", label: "Playing · 4 sessions" },
  { value: "paused", label: "Paused · 1 current session" },
  { value: "stopped", label: "Stopped · successful empty result" },
  { value: "loading", label: "Initial loading" },
  { value: "error", label: "Integration error" },
  { value: "partial", label: "Partial integration failure" },
  { value: "stale", label: "Stale observation" },
  { value: "unconfigured", label: "Missing configuration" },
  { value: "forbidden", label: "Access unavailable" },
];

function getObservationValue(prototype: AdaptiveContainerPrototypeContextValue) {
  const probe = prototype.state.probe;
  if (probe.status !== "success") return probe.status;
  if (probe.paused > 0 && probe.playing === 0) return "paused";
  if (probe.playing > 1) return "busy";
  if (probe.playing === 1) return "playing";
  return "stopped";
}

function sendObservation(prototype: AdaptiveContainerPrototypeContextValue, value: string | null) {
  if (!value) return;
  if (value === "playing") {
    prototype.setProbe({ status: "success", playing: 1, paused: 0 });
    return;
  }
  if (value === "busy") {
    prototype.setProbe({ status: "success", playing: 4, paused: 0 });
    return;
  }
  if (value === "paused") {
    prototype.setProbe({ status: "success", playing: 0, paused: 1 });
    return;
  }
  if (value === "stopped") {
    prototype.setProbe({ status: "success", playing: 0, paused: 0 });
    return;
  }
  prototype.setProbe({ status: value as PrototypeProbeStatus });
}

function ActivityInputs({ prototype }: { prototype: AdaptiveContainerPrototypeContextValue }) {
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text size="sm" fw={600}>
          Currently playing
        </Text>
        <Badge color="orange" variant="light" size="xs">
          Mock data
        </Badge>
      </Group>
      <div className={classes.quickActions}>
        <Button variant="default" size="xs" onClick={() => sendObservation(prototype, "playing")}>
          1 playing
        </Button>
        <Button variant="default" size="xs" onClick={() => sendObservation(prototype, "busy")}>
          4 playing
        </Button>
        <Button variant="default" size="xs" onClick={() => sendObservation(prototype, "paused")}>
          Paused
        </Button>
        <Button variant="default" size="xs" onClick={() => sendObservation(prototype, "stopped")}>
          Stopped
        </Button>
      </div>
      <Select
        size="xs"
        label="Observation"
        data={observationOptions}
        value={getObservationValue(prototype)}
        onChange={(value) => sendObservation(prototype, value)}
        allowDeselect={false}
        comboboxProps={{ withinPortal: false }}
      />
      <Group gap="xs" grow>
        <Button size="xs" variant="light" onClick={() => prototype.advance(10)}>
          Advance 10s
        </Button>
        <Button size="xs" variant="light" onClick={() => prototype.advance(31)}>
          Advance 31s
        </Button>
      </Group>
      <Group justify="space-between" gap="xs">
        <Text size="xs" c="dimmed">
          Clock {prototype.state.now}s · snapshot age {prototype.activity.age}s
        </Text>
        <Button size="compact-xs" variant="subtle" onClick={prototype.backgroundRefresh}>
          Refresh in background
        </Button>
      </Group>
      <Text size="xs" c="dimmed">
        Only the clock buttons advance time. Fresh empty data needs 10s of grace; observations expire after 30s. Paused
        sessions stay active.
      </Text>
    </Stack>
  );
}

export function NativeContainerPrototypeActions({ sectionId }: { sectionId: string }) {
  const prototype = useAdaptiveContainerPrototype();
  if (!prototype || prototype.sectionId !== sectionId || process.env.NODE_ENV === "production") return null;

  let selectedName = "Currently playing";
  if (prototype.state.selectedId === prototype.statsItemId) selectedName = "Stats · 2 of 2";
  else selectedName += " · 1 of 2";

  const page = () => {
    if (prototype.state.selectedId === prototype.mediaItemId) prototype.manualSelect(prototype.statsItemId);
    else prototype.manualSelect(prototype.mediaItemId);
  };

  return (
    <>
      <Group
        className={classes.containerActions}
        gap={4}
        onFocusCapture={() => {
          if (prototype.variant === "B") prototype.pause("focus");
        }}
      >
        <Button
          className={classes.containerEdit}
          size="compact-xs"
          variant="default"
          leftSection={<IconAdjustments size={13} />}
          onClick={prototype.openEditor}
        >
          Edit container
        </Button>
      </Group>
      {prototype.variant === "B" && (
        <Group
          className={classes.pager}
          gap={4}
          wrap="nowrap"
          aria-label="Browse configured stack items"
          onFocusCapture={() => prototype.pause("focus")}
        >
          <ActionIcon variant="subtle" size="sm" aria-label="Previous configured item" onClick={page}>
            <IconArrowLeft size={15} />
          </ActionIcon>
          <Text className={classes.pagerLabel} size="xs">
            {selectedName}
          </Text>
          <ActionIcon variant="subtle" size="sm" aria-label="Next configured item" onClick={page}>
            <IconArrowRight size={15} />
          </ActionIcon>
        </Group>
      )}
    </>
  );
}

function ContainerPreviewDrawer({ prototype }: { prototype: AdaptiveContainerPrototypeContextValue }) {
  const [isEditMode, { open: openBoardEditor, close: closeBoardEditor }] = useEditMode();
  const { settings, activity } = prototype;
  let activityColor = "gray";
  if (activity.kind === "active") activityColor = "teal";
  if (activity.kind === "unknown") activityColor = "yellow";
  if (activity.kind === "error") activityColor = "red";

  return (
    <Drawer
      opened={prototype.editorOpened}
      onClose={prototype.cancelEditor}
      position="right"
      size={370}
      title={
        <Group gap="xs">
          <Title order={4}>Edit container</Title>
          <Badge size="xs" variant="light">
            Live preview
          </Badge>
        </Group>
      }
      withOverlay={false}
      trapFocus={false}
      lockScroll={false}
      closeOnClickOutside={false}
      keepMounted
      transitionProps={{ duration: 0 }}
      zIndex={400}
      classNames={{ body: classes.drawerBody }}
    >
      <Stack gap="lg">
        <Box className={classes.previewNote}>
          <Text size="sm" fw={600}>
            {prototype.variant} · {variantNames[prototype.variant]}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {variantDescriptions[prototype.variant]}
          </Text>
        </Box>
        <Switch
          label="Edit board layout"
          description="Show all configured items at their saved positions in Homarr's real layout editor. This scratch prototype does not save changes."
          checked={isEditMode}
          onChange={(event) => {
            if (event.currentTarget.checked) openBoardEditor();
            else closeBoardEditor();
          }}
        />
        <Divider />
        <Switch
          label="Hide inactive widgets"
          description="Only a complete, fresh, successful empty observation can hide Currently playing."
          checked={settings.hideInactive}
          onChange={(event) => prototype.setSetting("hideInactive", event.currentTarget.checked)}
        />
        <Switch
          label="Show Stats fallback"
          description="Keep the configured 9 × 1 Playback sessions item available. Its numeric zero is not an idle signal."
          checked={settings.showFallback}
          onChange={(event) => prototype.setSetting("showFallback", event.currentTarget.checked)}
        />
        {prototype.variant === "C" && (
          <>
            <Select
              label="Fit strategy"
              data={[
                { value: "compact", label: "Compact · 1 row up to saved height" },
                { value: "details", label: "Details · keep saved media height" },
              ]}
              value={settings.fitStrategy}
              allowDeselect={false}
              onChange={(value) => {
                if (value === "compact" || value === "details") prototype.setSetting("fitStrategy", value);
              }}
            />
            <Switch
              label="Shrink outer container"
              description="Experimental. Reflow the real neighboring board content using display rows, without changing saved geometry."
              checked={settings.shrinkContainer}
              onChange={(event) => prototype.setSetting("shrinkContainer", event.currentTarget.checked)}
            />
          </>
        )}
        {prototype.variant === "B" && (
          <Paper withBorder p="sm">
            <Stack gap="xs">
              <Text size="sm" fw={600}>
                Selection stays in your control
              </Text>
              <Text size="xs" c="dimmed">
                Manual paging, keyboard focus, and hover pause automatic selection. Leaving the item does not resume it.
              </Text>
              {!prototype.state.automatic && <Text size="xs">Paused: {prototype.state.pausedReason}</Text>}
              <Button size="xs" variant="light" leftSection={<IconPlayerPlay size={14} />} onClick={prototype.resume}>
                Resume automatic selection
              </Button>
            </Stack>
          </Paper>
        )}
        <Group grow>
          <Button onClick={prototype.applyEditor}>Apply preview</Button>
          <Button variant="default" onClick={prototype.cancelEditor}>
            Cancel
          </Button>
        </Group>
        <Button
          size="xs"
          variant="subtle"
          onClick={() => {
            prototype.setSetting("hideInactive", true);
            prototype.setSetting("showFallback", true);
            prototype.setSetting("fitStrategy", "compact");
            prototype.setSetting("shrinkContainer", false);
          }}
        >
          Reset preview settings
        </Button>
        <Text size="xs" c="dimmed">
          These settings are local to this throwaway prototype. Cancel retains incoming activity. Proposed production
          default: hiding off.
        </Text>
        <Divider label="Activity simulation" labelPosition="left" />
        <ActivityInputs prototype={prototype} />
        <Paper withBorder p="sm">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="xs" fw={600}>
                Current decision
              </Text>
              <Badge size="xs" color={activityColor}>
                {activity.kind}
              </Badge>
            </Group>
            <Text size="xs">{activity.reason}</Text>
            <dl className={classes.observationReport}>
              <dt>Playing / paused</dt>
              <dd>
                {prototype.state.probe.playing} / {prototype.state.probe.paused}
              </dd>
              <dt>Observation age</dt>
              <dd>{activity.age}s</dd>
              <dt>Inactivity grace</dt>
              <dd>{activity.pendingSeconds ?? "—"}</dd>
              <dt>Saved media rows</dt>
              <dd>{prototype.mediaSavedRows}</dd>
              <dt>Saved container rows</dt>
              <dd>{prototype.savedContainerRows}</dd>
              <dt>Settings preview</dt>
              <dd>Local draft</dd>
            </dl>
          </Stack>
        </Paper>
        <Button variant="subtle" color="gray" size="xs" onClick={prototype.reset}>
          Reset prototype
        </Button>
      </Stack>
    </Drawer>
  );
}

export function NativePrototypeControls() {
  const prototype = useAdaptiveContainerPrototype();

  useEffect(() => {
    if (!prototype || process.env.NODE_ENV === "production") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          "input, textarea, select, [contenteditable], [role='combobox'], [role='listbox'], [role='slider'], [role='spinbutton'], [role='textbox']",
        )
      )
        return;
      let direction = 1;
      if (event.key === "ArrowLeft") direction = -1;
      const index = variants.indexOf(prototype.variant);
      const next = (index + direction + variants.length) % variants.length;
      const value = variants[next];
      if (!value) return;
      event.preventDefault();
      prototype.setVariant(value);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prototype]);

  if (!prototype || process.env.NODE_ENV === "production") return null;

  const cycle = (direction: number) => {
    const index = variants.indexOf(prototype.variant);
    const value = variants[(index + direction + variants.length) % variants.length];
    if (value) prototype.setVariant(value);
  };

  return (
    <>
      <ContainerPreviewDrawer prototype={prototype} />
      <Paper component="nav" className={classes.switcher} aria-label="Throwaway container prototype variants">
        <Group gap={5} wrap="nowrap">
          <ActionIcon variant="subtle" size="lg" aria-label="Previous prototype variant" onClick={() => cycle(-1)}>
            <IconArrowLeft size={19} />
          </ActionIcon>
          <Box className={classes.variantLabel}>
            <Text size="xs" c="dimmed">
              Prototype · real board
            </Text>
            <Text size="sm" fw={600}>
              {prototype.variant} · {variantNames[prototype.variant]}
            </Text>
          </Box>
          <ActionIcon variant="subtle" size="lg" aria-label="Next prototype variant" onClick={() => cycle(1)}>
            <IconArrowRight size={19} />
          </ActionIcon>
          <div className={classes.switcherDivider} />
          <Popover position="top" withArrow shadow="md" zIndex={500} transitionProps={{ duration: 0 }}>
            <Popover.Target>
              <Button variant="light" size="xs" leftSection={<IconFlask size={14} />}>
                Activity
              </Button>
            </Popover.Target>
            <Popover.Dropdown className={classes.activityMenu}>
              <ActivityInputs prototype={prototype} />
            </Popover.Dropdown>
          </Popover>
          <Button
            variant="default"
            size="xs"
            onClick={prototype.openEditor}
            aria-label="Edit prototype container settings"
          >
            <IconAdjustments size={15} />
            <span className={classes.switcherExtraLabel} style={{ marginLeft: 5 }}>
              Edit
            </span>
          </Button>
          {prototype.variant === "B" && !prototype.state.automatic && (
            <Button size="xs" variant="light" onClick={prototype.resume}>
              Resume
            </Button>
          )}
        </Group>
      </Paper>
    </>
  );
}
