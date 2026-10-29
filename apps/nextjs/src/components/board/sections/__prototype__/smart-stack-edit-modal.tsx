"use client";

import { useId } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconDatabase,
  IconPalette,
  IconRefresh,
  IconStack2,
} from "@tabler/icons-react";

import { ModalFormFooter } from "@homarr/modals";

import type {
  AdaptiveContainerPrototypeContextValue,
  PrototypeCounts,
  PrototypeScenario,
  StackVariant,
} from "./adaptive-container-context";
import classes from "./smart-stack-edit-modal.module.css";

export const stackVariants: { id: StackVariant; name: string; description: string }[] = [
  { id: "A", name: "Stack", description: "One focused state with vertical stack navigation." },
  { id: "B", name: "Reel", description: "A carousel with a glimpse of neighboring states." },
  { id: "C", name: "Inspector", description: "Keep every enabled state visible in a tray below the content." },
];
export const rotationNames = { manual: "Manual", timed: "Timed", smart: "Smart", hybrid: "Hybrid" };
const rotationDescriptions = {
  manual: "You choose the state. It stays selected until you choose another.",
  timed: "Move through enabled states at the chosen interval. Skip quiet states when that option is enabled.",
  smart: "Show the most relevant state when activity changes. There is no timed rotation.",
  hybrid: "Favor relevant states and rotate between eligible states at the chosen interval.",
};
const scenarios: { id: PrototypeScenario; label: string }[] = [
  { id: "watching", label: "Watching" },
  { id: "downloads", label: "Downloads busy" },
  { id: "requests", label: "Requests busy" },
  { id: "both", label: "Both busy" },
  { id: "idle", label: "All quiet" },
];
const countInputs: { key: keyof PrototypeCounts; label: string }[] = [
  { key: "playing", label: "Playing" },
  { key: "downloads", label: "Downloads" },
  { key: "requests", label: "Requests" },
];

export function SmartStackActivityControls({ prototype }: { prototype: AdaptiveContainerPrototypeContextValue }) {
  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text fw={600} size="sm">
          Activity
        </Text>
        <Badge size="xs" color="orange" variant="light">
          Mock data
        </Badge>
      </Group>
      <Text size="xs" c="dimmed">
        Change the real widgets' example data. A manual selection stays held until you resume rotation.
      </Text>
      <SimpleGrid cols={3} spacing="xs">
        {countInputs.map((input) => (
          <NumberInput
            key={input.key}
            label={input.label}
            size="xs"
            min={0}
            max={12}
            step={1}
            allowDecimal={false}
            allowNegative={false}
            clampBehavior="strict"
            value={prototype.state.counts[input.key]}
            onChange={(value) => {
              if (typeof value === "number") prototype.setCount(input.key, value);
              else if (value === "") prototype.setCount(input.key, 0);
            }}
          />
        ))}
      </SimpleGrid>
      <SimpleGrid cols={2} spacing={6}>
        {scenarios.map((scenario) => (
          <Button key={scenario.id} size="xs" variant="default" onClick={() => prototype.setScenario(scenario.id)}>
            {scenario.label}
          </Button>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

function StateSettings({ prototype }: { prototype: AdaptiveContainerPrototypeContextValue }) {
  return (
    <Stack gap="md">
      <div>
        <Title order={4}>States</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Choose what belongs in the stack, set its order, and preview any enabled state.
        </Text>
      </div>
      {prototype.settings.pageOrder.map((id, index) => {
        const page = prototype.pages.find((entry) => entry.id === id);
        if (!page) return null;
        const enabled = prototype.settings.enabledPages.includes(id);
        const lastEnabled = enabled && prototype.settings.enabledPages.length === 1;
        let borderColor = "var(--mantine-color-default-border)";
        if (prototype.selectedPageId === id) borderColor = "var(--mantine-color-violet-5)";
        let activityLabel = "Quiet";
        let activityColor = "gray";
        if (page.active) {
          activityLabel = "Active";
          activityColor = "teal";
        }
        return (
          <Paper key={id} withBorder p="sm" radius="md" style={{ borderColor }}>
            <Stack gap="sm">
              <Group justify="space-between" gap="xs" wrap="nowrap">
                <Group gap="xs">
                  <Text size="xs" c="dimmed" fw={600}>
                    {index + 1}
                  </Text>
                  <Badge size="xs" variant="light" color={activityColor}>
                    {activityLabel}
                  </Badge>
                </Group>
                <Group gap={4} wrap="nowrap">
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={"Move " + page.label + " up"}
                    disabled={index === 0}
                    onClick={() => prototype.movePage(id, -1)}
                  >
                    <IconChevronUp size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    aria-label={"Move " + page.label + " down"}
                    disabled={index === prototype.settings.pageOrder.length - 1}
                    onClick={() => prototype.movePage(id, 1)}
                  >
                    <IconChevronDown size={16} />
                  </ActionIcon>
                  <Button
                    size="compact-xs"
                    variant="light"
                    disabled={!enabled}
                    onClick={() => prototype.manualSelectPage(id)}
                  >
                    Preview
                  </Button>
                </Group>
              </Group>
              <TextInput
                label="State title"
                size="sm"
                value={prototype.settings.pageTitles[id]}
                onChange={(event) => prototype.setPageTitle(id, event.currentTarget.value)}
              />
              <Text size="xs" c="dimmed">
                {page.description}
              </Text>
              <Group justify="space-between" align="end" gap="md">
                <Switch
                  label="Enabled"
                  size="sm"
                  checked={enabled}
                  disabled={lastEnabled}
                  onChange={(event) => prototype.setPageEnabled(id, event.currentTarget.checked)}
                />
                <NumberInput
                  label="Smart priority"
                  size="xs"
                  w={118}
                  min={0}
                  max={100}
                  step={1}
                  allowDecimal={false}
                  value={prototype.settings.priorities[id]}
                  onChange={(value) => {
                    if (typeof value === "number") prototype.setPagePriority(id, value);
                  }}
                />
              </Group>
              {page.active && (
                <Text size="xs" c="teal">
                  Active now · relevance {page.score}
                </Text>
              )}
            </Stack>
          </Paper>
        );
      })}
      <Text size="xs" c="dimmed">
        Keep at least one state enabled. Higher priority helps Smart and Hybrid choose between active states.
      </Text>
    </Stack>
  );
}

function RotationSettings({ prototype }: { prototype: AdaptiveContainerPrototypeContextValue }) {
  const settings = prototype.settings;
  return (
    <Stack gap="lg">
      <div>
        <Title order={4}>Rotation</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Choose when the stack should change state.
        </Text>
      </div>
      <SegmentedControl
        fullWidth
        value={settings.mode}
        data={[
          { value: "manual", label: "Manual" },
          { value: "timed", label: "Timed" },
          { value: "smart", label: "Smart" },
          { value: "hybrid", label: "Hybrid" },
        ]}
        onChange={(value) => {
          if (value === "manual" || value === "timed" || value === "smart" || value === "hybrid")
            prototype.setSetting("mode", value);
        }}
      />
      <Paper withBorder p="sm">
        <Text size="sm">{rotationDescriptions[settings.mode]}</Text>
      </Paper>
      <NumberInput
        label="Rotation interval"
        description="Seconds between automatic changes in Timed and Hybrid."
        min={5}
        max={120}
        step={1}
        allowDecimal={false}
        allowNegative={false}
        clampBehavior="strict"
        suffix=" sec"
        disabled={settings.mode === "manual" || settings.mode === "smart"}
        value={settings.intervalSeconds}
        onChange={(value) => {
          if (typeof value === "number") prototype.setSetting("intervalSeconds", value);
        }}
      />
      <Switch
        label="Skip inactive states"
        description="Automatic rotation passes over states with no current activity."
        checked={settings.skipInactive}
        onChange={(event) => prototype.setSetting("skipInactive", event.currentTarget.checked)}
      />
      <Switch
        label="Pause on hover"
        description="Keep the current state still while your pointer is inside it."
        checked={settings.pauseOnHover}
        onChange={(event) => prototype.setSetting("pauseOnHover", event.currentTarget.checked)}
      />
      <Text size="xs" c="dimmed">
        Keyboard focus protects the current widget. Manual browsing holds your chosen state until Resume.
      </Text>
    </Stack>
  );
}

function AppearanceSettings({ prototype }: { prototype: AdaptiveContainerPrototypeContextValue }) {
  const settings = prototype.settings;
  return (
    <Stack gap="lg">
      <div>
        <Title order={4}>Appearance</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Compare three ways to present the same configured states.
        </Text>
      </div>
      <TextInput
        label="Container title"
        value={settings.title}
        onChange={(event) => prototype.setSetting("title", event.currentTarget.value)}
      />
      <Stack gap="xs">
        {stackVariants.map((variant) => (
          <UnstyledButton
            key={variant.id}
            className={classes.designChoice}
            data-selected={prototype.variant === variant.id || undefined}
            aria-pressed={prototype.variant === variant.id}
            onClick={() => prototype.setVariant(variant.id)}
          >
            <Badge variant="light" color={settings.accent}>
              {variant.id}
            </Badge>
            <div>
              <Text size="sm" fw={600}>
                {variant.name}
              </Text>
              <Text size="xs" c="dimmed">
                {variant.description}
              </Text>
            </div>
          </UnstyledButton>
        ))}
      </Stack>
      <div>
        <Text size="sm" fw={500} mb={6}>
          Accent
        </Text>
        <SegmentedControl
          fullWidth
          value={settings.accent}
          data={[
            { value: "violet", label: "Violet" },
            { value: "blue", label: "Blue" },
            { value: "teal", label: "Teal" },
          ]}
          onChange={(value) => {
            if (value === "violet" || value === "blue" || value === "teal") prototype.setSetting("accent", value);
          }}
        />
      </div>
      <div>
        <Text size="sm" fw={500} mb={6}>
          Transition
        </Text>
        <SegmentedControl
          fullWidth
          value={settings.transition}
          data={[
            { value: "slide", label: "Slide" },
            { value: "instant", label: "Instant" },
          ]}
          onChange={(value) => {
            if (value === "slide" || value === "instant") prototype.setSetting("transition", value);
          }}
        />
      </div>
      <Switch
        label="Reclaim unused space"
        description="Fit the selected state's content within the saved six-row maximum."
        checked={settings.reclaimSpace}
        onChange={(event) => prototype.setSetting("reclaimSpace", event.currentTarget.checked)}
      />
    </Stack>
  );
}

export function SmartStackEditModal({ prototype }: { prototype: AdaptiveContainerPrototypeContextValue }) {
  const formId = useId();
  const isNarrow = useMediaQuery("(max-width: 820px)");
  let tabsOrientation: "horizontal" | "vertical" = "vertical";
  if (isNarrow) tabsOrientation = "horizontal";
  const enabledPages = prototype.settings.pageOrder.filter((id) => prototype.settings.enabledPages.includes(id));
  const selectedIndex = enabledPages.indexOf(prototype.selectedPageId);
  const selectedTitle = prototype.settings.pageTitles[prototype.selectedPageId];

  return (
    <Modal
      opened={prototype.editorOpened}
      onClose={prototype.cancelEditor}
      size={1320}
      centered
      padding={0}
      transitionProps={{ duration: 0 }}
      zIndex={1000}
      closeOnClickOutside={false}
      title={
        <Group gap="sm">
          <Title order={3}>Edit smart container</Title>
          <Badge variant="light" size="xs">
            Live preview
          </Badge>
        </Group>
      }
      classNames={{ content: classes.modalContent, header: classes.modalHeader, body: classes.modalBody }}
    >
      <div className={classes.workspace}>
        <form
          id={formId}
          className={classes.settingsForm}
          onSubmit={(event) => {
            event.preventDefault();
            prototype.applyEditor();
          }}
        >
          <Tabs
            defaultValue="states"
            orientation={tabsOrientation}
            className={classes.settingsTabs}
            keepMounted
            keepMountedMode="display-none"
          >
            <Tabs.List className={classes.settingsList}>
              <Text className={classes.sidebarLabel} size="xs" c="dimmed" fw={600}>
                CONTAINER
              </Text>
              <Tabs.Tab value="states" leftSection={<IconStack2 size={17} />}>
                States
              </Tabs.Tab>
              <Tabs.Tab value="rotation" leftSection={<IconRefresh size={17} />}>
                Rotation
              </Tabs.Tab>
              <Tabs.Tab value="appearance" leftSection={<IconPalette size={17} />}>
                Appearance
              </Tabs.Tab>
              <Tabs.Tab value="data" leftSection={<IconDatabase size={17} />}>
                Data
              </Tabs.Tab>
            </Tabs.List>
            <div className={classes.settingsContent}>
              <Tabs.Panel value="states">
                <StateSettings prototype={prototype} />
              </Tabs.Panel>
              <Tabs.Panel value="rotation">
                <RotationSettings prototype={prototype} />
              </Tabs.Panel>
              <Tabs.Panel value="appearance">
                <AppearanceSettings prototype={prototype} />
              </Tabs.Panel>
              <Tabs.Panel value="data">
                <Stack gap="lg">
                  <div>
                    <Title order={4}>Example activity</Title>
                    <Text size="sm" c="dimmed" mt={4}>
                      Use these observations to compare every state and rotation mode.
                    </Text>
                  </div>
                  <SmartStackActivityControls prototype={prototype} />
                </Stack>
              </Tabs.Panel>
            </div>
          </Tabs>
        </form>
        <section className={classes.previewPanel} aria-label="Live smart container preview">
          <Group justify="space-between">
            <Text size="sm" fw={600}>
              Live preview
            </Text>
            <Badge size="xs" variant="light" color={prototype.settings.accent}>
              {rotationNames[prototype.settings.mode]}
            </Badge>
          </Group>
          <Text size="xs" c="dimmed">
            The same container and widgets from your board, with your changes applied.
          </Text>
          {prototype.editorOpened && (
            <div ref={prototype.setPreviewHost} className={classes.previewHost} data-smart-stack-preview-host />
          )}
          <Group
            className={classes.previewNavigation}
            justify="space-between"
            gap="xs"
            wrap="nowrap"
            aria-label="Preview states"
          >
            <Button
              size="md"
              variant="default"
              leftSection={<IconChevronLeft size={21} />}
              aria-label="Previous preview state"
              onClick={() => prototype.nextPage(-1)}
            >
              <span className={classes.navigationLabel}>Previous state</span>
            </Button>
            <div className={classes.selectedState}>
              <Text size="sm" fw={600} truncate>
                {selectedTitle}
              </Text>
              <Text size="xs" c="dimmed">
                {selectedIndex + 1} / {enabledPages.length}
              </Text>
            </div>
            <Button
              size="md"
              variant="default"
              rightSection={<IconChevronRight size={21} />}
              aria-label="Next preview state"
              onClick={() => prototype.nextPage(1)}
            >
              <span className={classes.navigationLabel}>Next state</span>
            </Button>
          </Group>
          <Text className={classes.previewReason} size="xs" c="dimmed">
            {prototype.selectionReason}
          </Text>
        </section>
      </div>
      <Box className={classes.footer}>
        <ModalFormFooter
          onCancel={prototype.cancelEditor}
          form={formId}
          submitLabel="Apply"
          leftSection={
            <Text size="xs" c="dimmed">
              Preview changes are local until you apply.
            </Text>
          }
        />
      </Box>
    </Modal>
  );
}
