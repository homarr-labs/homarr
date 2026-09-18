"use client";
import { useState } from "react";
import { ActionIcon, Button, Card, Checkbox, Group, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from "@tabler/icons-react";
import { clientApi } from "@homarr/api/client";
import { createId } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";
import { statsEntriesSchema } from "../stats/config";
import type { StatsEntry } from "../stats/config";
import type { CommonWidgetInputProps } from "./common";
import { useFormContext } from "./form";

export const WidgetStatsEntriesInput = ({ property }: CommonWidgetInputProps<"statsEntries">) => {
  const form = useFormContext();
  const t = useI18n("widget.stats");
  const [source, setSource] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const entries = statsEntriesSchema.safeParse(form.values.options[property]).data ?? [];
  const ids = [...new Set(form.values.integrationIds)];
  const catalogs = clientApi.useQueries((api) =>
    ids.map((integrationId) => api.widget.stats.catalog({ integrationId }, { staleTime: 60_000, retry: false })),
  );
  const sourceCatalog = catalogs[ids.indexOf(source ?? "")]?.data;
  const save = (next: StatsEntry[]) => form.setFieldValue(`options.${property}`, next);
  const update = (id: string, patch: Partial<StatsEntry>) =>
    save(
      entries.map((entry) => {
        if (entry.id === id) return { ...entry, ...patch };
        return entry;
      }),
    );
  const move = (index: number, delta: number) => {
    const next = [...entries];
    const item = next.splice(index, 1)[0];
    if (!item) return;
    next.splice(index + delta, 0, item);
    save(next);
  };

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        {t("editorHelp")}
      </Text>
      <Select
        label={t("source")}
        searchable
        value={source}
        onChange={(value) => {
          setSource(value);
          setSelectedMetric(null);
        }}
        data={ids.map((id, index) => ({ value: id, label: catalogs[index]?.data?.name ?? id }))}
      />
      <Select
        label={t("metric")}
        searchable
        value={selectedMetric}
        onChange={setSelectedMetric}
        data={(sourceCatalog?.metrics ?? []).map((metric) => ({ value: metric.key, label: metric.label }))}
        nothingFoundMessage={t("noMetrics")}
      />
      <Button
        size="xs"
        leftSection={<IconPlus size={14} />}
        disabled={!source || !selectedMetric || entries.length >= 100}
        onClick={() => {
          if (!source || !selectedMetric) return;
          save([
            ...entries,
            {
              id: createId(),
              integrationId: source,
              metric: selectedMetric,
              label: "",
              hidden: false,
              compact: false,
            },
          ]);
        }}
      >
        {t("add")}
      </Button>
      {entries.map((entry, index) => (
        <Card key={entry.id} withBorder padding="sm">
          <Stack gap="xs">
            <Text size="xs" c="dimmed">
              {catalogs[ids.indexOf(entry.integrationId)]?.data?.name} · {entry.metric}
            </Text>
            <TextInput
              aria-label={t("label")}
              placeholder={t("label")}
              value={entry.label}
              maxLength={128}
              onChange={(event) => update(entry.id, { label: event.currentTarget.value })}
            />
            <Group justify="space-between">
              <Group>
                <Checkbox
                  label={t("hidden")}
                  checked={entry.hidden}
                  onChange={(event) => update(entry.id, { hidden: event.currentTarget.checked })}
                />
                <Checkbox
                  label={t("compact")}
                  checked={entry.compact}
                  onChange={(event) => update(entry.id, { compact: event.currentTarget.checked })}
                />
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
