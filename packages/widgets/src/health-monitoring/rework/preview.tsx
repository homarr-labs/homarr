"use client";

import { useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  MultiSelect,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Text,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconArrowDown, IconArrowUp, IconArrowsMaximize, IconSettings } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";

import { toScopedStorageVolumeValue } from "../../filter-storage-volumes";
import { WidgetCardShell } from "../../widget-card-shell";
import { useWidgetFixtureRuntime, WidgetFixturePreview } from "./widget-fixture-preview";
import { fixtureKindLabels, getHealthPreviewData, healthPreviewScenarios } from "./fixtures";
import classes from "./preview.module.css";

export function HealthMonitoringPreview({
  initialScenario = "normal",
  baselineBoard,
}: {
  initialScenario?: string;
  baselineBoard: RouterOutputs["board"]["getBoardByName"];
}) {
  const [scenario, setScenario] = useState(initialScenario);
  const [size, setSize] = useState("1100");
  const [height, setHeight] = useState("520");
  const [advanced, setAdvanced] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [draftSources, setDraftSources] = useState<string[]>([]);
  const [draftCluster, setDraftCluster] = useState(true);
  const [sourceIds, setSourceIds] = useLocalStorage<string[] | null>({
    key: "health-rework-preview-sources-v1",
    defaultValue: null,
  });
  const [showCluster, setShowCluster] = useLocalStorage({
    key: "health-rework-preview-cluster-v1",
    defaultValue: true,
  });
  const fixtures = useMemo(() => getHealthPreviewData(scenario), [scenario]);
  const allSystems = useMemo(() => getHealthPreviewData("normal").systems, []);
  const data = useMemo(() => {
    let systems = fixtures.systems;
    if (sourceIds !== null) {
      systems = sourceIds.flatMap((id) =>
        fixtures.systems.filter((system) => system.id === id || system.id.startsWith(`${id}-`)),
      );
    }
    return { ...fixtures, systems, cluster: showCluster ? fixtures.cluster : null };
  }, [fixtures, showCluster, sourceIds]);
  const runtime = useWidgetFixtureRuntime(data);
  const [draftWidgetOptions, setDraftWidgetOptions] = useState(runtime.options);
  const storageOptions = allSystems.flatMap((system) => {
    const devices = new Set(system.health?.fileSystem.map((device) => device.deviceName) ?? []);
    if (devices.size === 0) {
      for (const device of system.health?.smart ?? []) devices.add(device.deviceName);
    }
    return [...devices].map((device) => ({
      value: toScopedStorageVolumeValue(system.id, device),
      label: `${system.name} · ${device}`,
    }));
  });
  const options = allSystems.map((system) => ({
    value: system.id,
    label: `${system.name} · ${fixtureKindLabels[system.kind]}`,
  }));
  function openConfiguration() {
    setDraftSources(sourceIds ?? allSystems.map((system) => system.id));
    setDraftCluster(showCluster);
    setDraftWidgetOptions(runtime.options);
    setConfiguring(true);
  }

  function moveSource(index: number, offset: number) {
    setDraftSources((current) => {
      const next = [...current];
      const id = next[index];
      const target = index + offset;
      if (id === undefined || target < 0 || target >= next.length) return current;
      next.splice(index, 1);
      next.splice(target, 0, id);
      return next;
    });
  }

  return (
    <Stack gap="md" p="md" className={classes.readable}>
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Group gap="xs">
            <Text size="xl" fw={650}>
              System health
            </Text>
            <Badge variant="light" color="gray" radius="sm">
              Fixture preview
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            The production widget with disposable integration fixtures. Advance readings to collect real session
            samples.
          </Text>
        </Stack>
      </Group>
      <Group gap="md" align="flex-end">
        <Select
          label="Fixture"
          size="xs"
          w={210}
          value={scenario}
          onChange={(value) => setScenario(value ?? "normal")}
          data={healthPreviewScenarios}
          allowDeselect={false}
        />
        <Select
          label="Parent width"
          size="xs"
          w={120}
          value={size}
          onChange={(value) => setSize(value ?? "1100")}
          data={["240", "320", "322", "360", "366", "368", "452", "454", "600", "602", "720", "924", "926", "1100"]}
          allowDeselect={false}
        />
        <Select
          label="Parent height"
          size="xs"
          w={120}
          value={height}
          onChange={(value) => setHeight(value ?? "520")}
          data={[
            "160",
            "208",
            "209",
            "215",
            "240",
            "263",
            "264",
            "280",
            "288",
            "289",
            "300",
            "348",
            "349",
            "452",
            "500",
            "501",
            "520",
            "740",
          ]}
          allowDeselect={false}
        />
        <Switch
          mb={4}
          label="Advanced mode"
          checked={advanced}
          onChange={(event) => setAdvanced(event.currentTarget.checked)}
        />
        <Button size="xs" variant="default" onClick={runtime.advanceReading}>
          Advance reading ({runtime.reading})
        </Button>
        <Button size="xs" variant="default" onClick={runtime.failRefresh}>
          Fail refresh
        </Button>
      </Group>
      <Box maw="100%" w={Number(size)}>
        <WidgetCardShell
          kind="healthMonitoring"
          advancedOptions={{ title: null, customCssClasses: [], borderColor: "" }}
          opacity={1}
          radius="md"
          p={0}
          h={Number(height)}
        >
          <Group
            px="sm"
            py={8}
            justify="space-between"
            gap={6}
            wrap="nowrap"
            style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
          >
            <Text size="xs" fw={600}>
              Health monitoring
            </Text>
            <Group gap={4} wrap="nowrap">
              <ActionIcon
                variant="subtle"
                color="gray"
                size={30}
                aria-label="Configure sources"
                onClick={openConfiguration}
              >
                <IconSettings size={16} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="gray"
                size={30}
                aria-label="Open advanced mode"
                onClick={() => setExpanded(true)}
              >
                <IconArrowsMaximize size={16} />
              </ActionIcon>
            </Group>
          </Group>
          <Box style={{ flex: 1, minHeight: 0 }}>
            <WidgetFixturePreview runtime={runtime} board={baselineBoard} advanced={advanced} />
          </Box>
        </WidgetCardShell>
      </Box>
      <Text size="xs" c="dimmed">
        Disposable fixtures for every supported integration · Charts use observed updates · Preferences survive reloads.
      </Text>
      <Modal
        closeButtonProps={{ "aria-label": "Close advanced view" }}
        classNames={{ content: classes.readable }}
        attributes={{ header: { role: "presentation" } }}
        opened={expanded}
        onClose={() => setExpanded(false)}
        title="Health monitoring · Advanced"
        size="min(1440px, calc(100vw - 32px))"
        centered
      >
        <Box h="75vh">
          <WidgetFixturePreview runtime={runtime} board={baselineBoard} advanced />
        </Box>
      </Modal>
      <Modal
        closeButtonProps={{ "aria-label": "Close source configuration" }}
        classNames={{ content: classes.readable }}
        attributes={{ header: { role: "presentation" } }}
        opened={configuring}
        onClose={() => setConfiguring(false)}
        title="Sources and order"
        size="lg"
        centered
      >
        <ScrollArea.Autosize mah="70vh">
          <Stack gap="md">
            <MultiSelect
              label="Visible systems"
              description="Discover sources, select the ones to show, then arrange them below."
              data={options}
              value={draftSources}
              onChange={setDraftSources}
              searchable
              clearable
            />
            <Stack gap={4}>
              {draftSources.map((id, index) => (
                <Group key={id} justify="space-between" wrap="nowrap" gap="xs">
                  <Text size="sm" truncate>
                    {allSystems.find((system) => system.id === id)?.name ?? id}
                  </Text>
                  <Group gap={4} wrap="nowrap">
                    <ActionIcon
                      variant="default"
                      aria-label={`Move ${id} up`}
                      disabled={index === 0}
                      onClick={() => moveSource(index, -1)}
                    >
                      <IconArrowUp size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="default"
                      aria-label={`Move ${id} down`}
                      disabled={index === draftSources.length - 1}
                      onClick={() => moveSource(index, 1)}
                    >
                      <IconArrowDown size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              ))}
            </Stack>
            <Switch
              label="Show Proxmox cluster"
              checked={draftCluster}
              onChange={(event) => setDraftCluster(event.currentTarget.checked)}
            />
            <>
              <Text size="sm" fw={600}>
                Widget options
              </Text>
              <Group gap="md">
                {[
                  { key: "cpu", label: "CPU" },
                  { key: "memory", label: "Memory" },
                  { key: "gpu", label: "Graphics" },
                  { key: "fileSystem", label: "Storage" },
                  { key: "showUptime", label: "Uptime" },
                  { key: "fahrenheit", label: "Fahrenheit" },
                ].map(({ key, label }) => (
                  <Switch
                    key={key}
                    label={label}
                    checked={Boolean(draftWidgetOptions[key as keyof typeof draftWidgetOptions])}
                    onChange={(event) => {
                      const checked = event.currentTarget.checked;
                      setDraftWidgetOptions((current) => ({ ...current, [key]: checked }));
                    }}
                  />
                ))}
              </Group>
              <MultiSelect
                label="Visible storage volumes"
                description="Leave empty to show every reported volume. Saved values use the production volume format."
                value={draftWidgetOptions.visibleStorageVolumes}
                onChange={(visibleStorageVolumes) =>
                  setDraftWidgetOptions((current) => ({ ...current, visibleStorageVolumes }))
                }
                data={storageOptions}
                searchable
                clearable
              />
            </>
            <Group justify="space-between">
              <Button
                variant="subtle"
                onClick={() => {
                  setDraftSources(allSystems.map((system) => system.id));
                  setDraftCluster(true);
                }}
              >
                All sources
              </Button>
              <Group>
                <Button variant="default" onClick={() => setConfiguring(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setSourceIds(draftSources);
                    setShowCluster(draftCluster);
                    runtime.setOptions({ newOptions: draftWidgetOptions });
                    setConfiguring(false);
                  }}
                >
                  Save
                </Button>
              </Group>
            </Group>
          </Stack>
        </ScrollArea.Autosize>
      </Modal>
    </Stack>
  );
}
