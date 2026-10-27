"use client";

import {
  ActionIcon,
  Badge,
  Button,
  Divider,
  Drawer,
  Group,
  NumberInput,
  Paper,
  Stack,
  Switch,
  Text,
  Title,
} from "@mantine/core";
import { IconAdjustments, IconArrowLeft, IconArrowRight, IconPlayerPlay } from "@tabler/icons-react";

import { useEditMode } from "@homarr/boards/edit-mode";
import { iconSizes, zoomCompensatedSize } from "@homarr/ui";

import type {
  AdaptiveContainerPrototypeContextValue,
  PrototypeCounts,
  PrototypeScenario,
  SmartPageId,
} from "./adaptive-container-context";
import { useAdaptiveContainerPrototype } from "./adaptive-container-context";
import classes from "./prototype-controls.module.css";

// One throwaway smart container on the real board: activity chooses its page and how widgets share space.
const scenarios: { id: PrototypeScenario; label: string }[] = [
  { id: "watching", label: "Watching" },
  { id: "downloads", label: "Downloads take over" },
  { id: "requests", label: "Requests take over" },
  { id: "both", label: "Both busy" },
  { id: "idle", label: "All quiet" },
];
const scenarioDescriptions = {
  watching: "Playback makes Watching relevant; Services can take over when it stops.",
  downloads: "Downloads can take over the Services page.",
  requests: "Requests can take over the Services page.",
  both: "Busy services share the six-row budget.",
  idle: "Quiet services stay available in compact rows.",
};
const countControls: { key: keyof PrototypeCounts; label: string }[] = [
  { key: "playing", label: "Playing" },
  { key: "downloads", label: "Downloads" },
  { key: "requests", label: "Requests" },
];

function pageLabel(id: SmartPageId) {
  if (id === "watching") return "Watching";
  return "Services";
}

function changePage(prototype: AdaptiveContainerPrototypeContextValue, direction: number) {
  const current = prototype.pages.findIndex((page) => page.id === prototype.selectedPageId);
  const index = (current + direction + prototype.pages.length) % prototype.pages.length;
  const page = prototype.pages[index];
  if (page) prototype.manualSelectPage(page.id);
}

export function NativeContainerPrototypeActions({ sectionId }: { sectionId: string }) {
  const prototype = useAdaptiveContainerPrototype();
  if (!prototype || prototype.sectionId !== sectionId || process.env.NODE_ENV === "production") return null;
  const selectedIndex = prototype.pages.findIndex((page) => page.id === prototype.selectedPageId);

  return (
    <Group
      className={classes.containerToolbar}
      justify="space-between"
      gap={5}
      wrap="nowrap"
      aria-label="Smart container pages"
    >
      <Group gap={3} wrap="nowrap">
        <ActionIcon
          style={zoomCompensatedSize(28)}
          size="sm"
          variant="subtle"
          aria-label="Previous container page"
          onClick={() => changePage(prototype, -1)}
        >
          <IconArrowLeft style={iconSizes.sm} />
        </ActionIcon>
        {prototype.pages.map((page) => {
          let variant = "subtle";
          if (page.id === prototype.selectedPageId) variant = "light";
          return (
            <Button
              className={classes.toolbarButton}
              key={page.id}
              size="compact-xs"
              variant={variant}
              aria-pressed={page.id === prototype.selectedPageId}
              onClick={() => prototype.manualSelectPage(page.id)}
            >
              {page.label}
            </Button>
          );
        })}
        <ActionIcon
          style={zoomCompensatedSize(28)}
          size="sm"
          variant="subtle"
          aria-label="Next container page"
          onClick={() => changePage(prototype, 1)}
        >
          <IconArrowRight style={iconSizes.sm} />
        </ActionIcon>
        <Text className={classes.pagePosition} size="xs" c="dimmed">
          {selectedIndex + 1}/2
        </Text>
      </Group>
      <Group gap={5} wrap="nowrap">
        {prototype.state.automatic && (
          <Text size="xs" fw={600} c="teal">
            Auto
          </Text>
        )}
        {!prototype.state.automatic && (
          <>
            <Text className={classes.manualLabel} size="xs" c="dimmed">
              Manual
            </Text>
            <Button className={classes.toolbarButton} size="compact-xs" variant="light" onClick={prototype.resume}>
              Resume
            </Button>
          </>
        )}
        <ActionIcon
          style={zoomCompensatedSize(28)}
          size="sm"
          variant="default"
          aria-label="Edit smart container"
          title="Edit smart container"
          onClick={prototype.openEditor}
        >
          <IconAdjustments style={iconSizes.sm} />
        </ActionIcon>
      </Group>
    </Group>
  );
}

function ContainerPreviewDrawer({ prototype }: { prototype: AdaptiveContainerPrototypeContextValue }) {
  const [isEditMode, { open: openBoardEditor, close: closeBoardEditor }] = useEditMode();

  return (
    <Drawer
      opened={prototype.editorOpened}
      onClose={prototype.cancelEditor}
      position="right"
      size={370}
      title={
        <Group gap="xs">
          <Title order={4}>Edit smart container</Title>
          <Badge size="xs" variant="light">
            Preview
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
        <Stack gap={5}>
          <Text size="sm" fw={600}>
            Two pages, one smart container
          </Text>
          <Text size="xs" c="dimmed">
            Watching contains Currently playing. Services contains Downloads and Requests. Activity chooses the page and
            how its widgets share a maximum of six rows.
          </Text>
        </Stack>
        <Switch
          label="Reclaim unused space"
          description="Shrink the container to the selected page's allocated rows. Saved layout sizes stay unchanged."
          checked={prototype.settings.reclaimSpace}
          onChange={(event) => prototype.setSetting("reclaimSpace", event.currentTarget.checked)}
        />
        <Switch
          label="Edit board layout"
          description="Show all configured items at their saved positions in Homarr's real editor. This scratch prototype does not save changes."
          checked={isEditMode}
          onChange={(event) => {
            if (event.currentTarget.checked) openBoardEditor();
            else closeBoardEditor();
          }}
        />
        <Group grow>
          <Button onClick={prototype.applyEditor}>Apply preview</Button>
          <Button variant="default" onClick={prototype.cancelEditor}>
            Cancel
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          Only this demo's in-memory settings change. Cancel retains activity updates. No page is chosen as a winning
          design.
        </Text>
        <Divider label="Mock activity · updates immediately" labelPosition="left" />
        <Group grow gap="xs" align="flex-start">
          {countControls.map((control) => (
            <NumberInput
              key={control.key}
              label={control.label}
              size="xs"
              min={0}
              max={12}
              step={1}
              allowDecimal={false}
              allowNegative={false}
              clampBehavior="strict"
              value={prototype.state.counts[control.key]}
              onChange={(value) => {
                if (typeof value === "number") prototype.setCount(control.key, value);
                else if (value === "") prototype.setCount(control.key, 0);
              }}
            />
          ))}
        </Group>
        <Divider label="Page membership and allocation" labelPosition="left" />
        {prototype.pages.map((page) => {
          const allocations = prototype.allocations.filter((allocation) => allocation.pageId === page.id);
          const rowCount = allocations.reduce((sum, allocation) => sum + allocation.rows, 0);
          let variant = "outline";
          if (page.id === prototype.selectedPageId) variant = "light";
          return (
            <Paper key={page.id} withBorder p="sm">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    {page.label}
                  </Text>
                  <Badge variant={variant} size="xs">
                    {rowCount}/6 rows
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  {page.description}
                </Text>
                {allocations.map((allocation) => (
                  <Stack key={allocation.itemId} gap={3} className={classes.allocation}>
                    <Group justify="space-between">
                      <Text size="xs" fw={600}>
                        {allocation.label}
                      </Text>
                      <Text size="xs">
                        {allocation.count} active · {allocation.rows} rows
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {allocation.reason}
                    </Text>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          );
        })}
        <Paper withBorder p="sm">
          <Stack gap="xs">
            <Text size="xs" fw={600}>
              Selected: {pageLabel(prototype.selectedPageId)}
            </Text>
            <Text size="xs">{prototype.selectionReason}</Text>
            {!prototype.state.automatic && (
              <Text size="xs" c="dimmed">
                Paused by {prototype.state.pausedReason}. Changing activity does not release this hold.
              </Text>
            )}
            <Button size="xs" variant="light" leftSection={<IconPlayerPlay size={14} />} onClick={prototype.resume}>
              Resume automatic selection
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Drawer>
  );
}

export function NativePrototypeControls() {
  const prototype = useAdaptiveContainerPrototype();
  if (!prototype || process.env.NODE_ENV === "production") return null;
  const allocationSummary = prototype.allocations
    .filter((allocation) => allocation.pageId === prototype.selectedPageId)
    .map((allocation) => allocation.label + ": " + allocation.rows + " rows")
    .join(" · ");

  return (
    <>
      <ContainerPreviewDrawer prototype={prototype} />
      <Paper className={classes.demoPanel} aria-label="Smart container activity scenarios">
        <Stack gap={7}>
          <Group justify="space-between" gap="xs">
            <Group gap="xs">
              <Text size="sm" fw={600}>
                Smart container · 2 states
              </Text>
              <Badge size="xs" color="orange" variant="light">
                Mock activity
              </Badge>
            </Group>
            <Group gap="xs">
              {!prototype.state.automatic && (
                <Button size="compact-xs" variant="light" onClick={prototype.resume}>
                  Resume auto
                </Button>
              )}
              <Button
                size="compact-xs"
                variant="subtle"
                leftSection={<IconAdjustments size={13} />}
                onClick={prototype.openEditor}
              >
                Edit container
              </Button>
            </Group>
          </Group>
          <Text size="xs">
            <Text component="span" fw={600}>
              {pageLabel(prototype.selectedPageId)}:{" "}
            </Text>
            {prototype.selectionReason}
          </Text>
          <Group gap={6} className={classes.scenarioButtons}>
            {scenarios.map((scenario) => {
              let variant = "default";
              if (prototype.state.scenario === scenario.id) variant = "light";
              return (
                <Button
                  key={scenario.id}
                  size="xs"
                  variant={variant}
                  aria-pressed={prototype.state.scenario === scenario.id}
                  onClick={() => prototype.setScenario(scenario.id)}
                >
                  {scenario.label}
                </Button>
              );
            })}
          </Group>
          <Text size="xs" c="dimmed">
            {scenarioDescriptions[prototype.state.scenario]}
            {" " + allocationSummary + "."}
            {!prototype.state.automatic && " The selected page is held until Resume."}
          </Text>
        </Stack>
      </Paper>
    </>
  );
}
