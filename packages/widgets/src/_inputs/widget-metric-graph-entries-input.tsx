"use client";
import { useEffect, useState } from "react";
import {
  ActionIcon,
  Button,
  Card,
  CheckIcon,
  ColorSwatch,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { createId } from "@homarr/common";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { MAX_METRIC_GRAPH_ENTRIES, metricGraphColors, metricGraphEntriesSchema } from "../metric-graph/config";
import type { MetricGraphEntry } from "../metric-graph/config";
import type { CommonWidgetInputProps } from "./common";
import { useFormContext } from "./form";

type Source = MetricGraphEntry["source"];

const smartHomeKinds: readonly IntegrationKind[] = getIntegrationKindsByCategory("smartHomeServer");

export const WidgetMetricGraphEntriesInput = ({ property }: CommonWidgetInputProps<"metricGraphEntries">) => {
  const form = useFormContext();
  const t = useI18n("widget.metricGraph");
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [source, setSource] = useState<Source>("stats");
  const [value, setValue] = useState<string | null>(null);
  const entries = metricGraphEntriesSchema.safeParse(form.values.options[property]).data ?? [];
  const ids = [...new Set(form.values.integrationIds)];
  const catalogs = clientApi.useQueries((api) =>
    ids.map((id) => api.widget.stats.catalog({ integrationId: id }, { staleTime: 60_000, retry: false })),
  );
  const getCatalog = (id: string | null) => catalogs[ids.indexOf(id ?? "")]?.data;
  const selectedCatalog = getCatalog(integrationId);
  const supportsSensors = selectedCatalog !== undefined && smartHomeKinds.includes(selectedCatalog.kind);
  const activeSource: Source = supportsSensors ? source : "stats";
  const sensorCatalog = clientApi.widget.smartHome.catalog.useQuery(
    { integrationId: integrationId ?? "" },
    { enabled: supportsSensors && activeSource === "smartHome", staleTime: 60_000, retry: false },
  );

  const valueOptions =
    activeSource === "smartHome"
      ? (sensorCatalog.data?.entities ?? [])
          .filter((entity) => entity.domain === "sensor" && !entity.hidden)
          .map((entity) => ({ value: entity.id, label: entity.name }))
      : (selectedCatalog?.metrics ?? [])
          .filter((metric) => metric.unit !== "text")
          .map((metric) => ({ value: metric.key, label: metric.label }));

  const save = (next: MetricGraphEntry[]) => form.setFieldValue(`options.${property}`, next);
  // Unlinking an integration removes its values, so the saved widget keeps no entries it cannot show.
  const linkedKey = ids.join(",");
  useEffect(() => {
    const kept = entries.filter((entry) => ids.includes(entry.integrationId));
    if (kept.length !== entries.length) save(kept);
    // Runs when the linked integrations change; the entries are read fresh then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedKey]);
  const update = (id: string, patch: Partial<Pick<MetricGraphEntry, "label" | "color">>) =>
    save(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  const move = (index: number, delta: number) => {
    const next = [...entries];
    const item = next.splice(index, 1)[0];
    if (!item) return;
    next.splice(index + delta, 0, item);
    save(next);
  };
  const add = () => {
    if (!integrationId || !value) return;
    const usedColors = new Set(entries.map((entry) => entry.color));
    const color = metricGraphColors.find((item) => !usedColors.has(item)) ?? "blue";
    const base = { id: createId(), integrationId, label: "", color };
    save([
      ...entries,
      activeSource === "smartHome"
        ? { ...base, source: "smartHome", entityId: value }
        : { ...base, source: "stats", metric: value },
    ]);
    setValue(null);
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        {t("editorHelp")}
      </Text>
      <Select
        label={t("source")}
        searchable
        value={integrationId}
        onChange={(next) => {
          setIntegrationId(next);
          setValue(null);
        }}
        data={ids.map((id, index) => ({ value: id, label: catalogs[index]?.data?.name ?? id }))}
      />
      {supportsSensors && (
        <SegmentedControl
          aria-label={t("type.label")}
          value={activeSource}
          onChange={(next) => {
            setSource(next as Source);
            setValue(null);
          }}
          data={[
            { value: "smartHome", label: t("type.smartHome") },
            { value: "stats", label: t("type.stats") },
          ]}
        />
      )}
      <Select
        label={t("metric")}
        searchable
        value={value}
        onChange={setValue}
        data={valueOptions}
        nothingFoundMessage={t("noMetrics")}
      />
      <Button
        size="xs"
        leftSection={<IconPlus size={14} />}
        disabled={!integrationId || !value || entries.length >= MAX_METRIC_GRAPH_ENTRIES}
        onClick={add}
      >
        {t("add")}
      </Button>
      {entries.map((entry, index) => (
        <Card key={entry.id} padding="sm">
          <Stack gap="xs">
            <Text size="xs" c="dimmed">
              {getCatalog(entry.integrationId)?.name} · {entry.source === "stats" ? entry.metric : entry.entityId}
            </Text>
            <TextInput
              aria-label={t("label")}
              placeholder={t("label")}
              value={entry.label}
              maxLength={128}
              onChange={(event) => update(entry.id, { label: event.currentTarget.value })}
            />
            <Group justify="space-between">
              <Group gap={6} aria-label={t("color")}>
                {metricGraphColors.map((color) => (
                  <ColorSwatch
                    key={color}
                    component="button"
                    type="button"
                    aria-pressed={entry.color === color}
                    aria-label={color}
                    color={`var(--mantine-color-${color}-5)`}
                    size={18}
                    style={{ cursor: "pointer" }}
                    onClick={() => update(entry.id, { color })}
                  >
                    {entry.color === color && <CheckIcon size={10} color="white" />}
                  </ColorSwatch>
                ))}
              </Group>
              <Group gap={4}>
                <ActionIcon
                  variant="subtle"
                  disabled={index === 0}
                  aria-label={t("moveUp")}
                  onClick={() => move(index, -1)}
                >
                  <IconArrowUp size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  disabled={index === entries.length - 1}
                  aria-label={t("moveDown")}
                  onClick={() => move(index, 1)}
                >
                  <IconArrowDown size={16} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  aria-label={t("remove")}
                  onClick={() => save(entries.filter((item) => item.id !== entry.id))}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
};
