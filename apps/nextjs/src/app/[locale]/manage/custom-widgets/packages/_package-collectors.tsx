"use client";

import { extractErrorMessage } from "@homarr/common";

import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Accordion,
  Table,
} from "@mantine/core";
import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

export function PackageCollectors({ itemId, queries }: { itemId: string; queries: string[] }) {
  const t = useI18n("customWidget.package");
  const collectors = clientApi.customWidget.package.collectors.useQuery({ itemId });
  const save = clientApi.customWidget.package.saveCollector.useMutation();
  const [name, setName] = useState("");
  const [handler, setHandler] = useState<string | null>(queries[0] ?? null);
  const [input, setInput] = useState("{}");
  const [valuePath, setValuePath] = useState("");
  const [unit, setUnit] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [retentionDays, setRetentionDays] = useState(7);
  const [maximumPoints, setMaximumPoints] = useState(2000);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  const submit = () => {
    if (!handler) return;
    try {
      const params: unknown = JSON.parse(input);
      save.mutate(
        {
          itemId,
          name,
          handler,
          input: params,
          valuePath,
          unit,
          intervalSeconds,
          retentionDays,
          maximumPoints,
          enabled,
        },
        {
          onSuccess: () => {
            setName("");
            setEnabled(false);
            void collectors.refetch();
          },
          onError: (cause) => setError(cause.message),
        },
      );
    } catch (cause) {
      setError(extractErrorMessage(cause));
    }
  };
  return (
    <Stack>
      <Text size="sm">{t("collectionDescription")}</Text>
      {(collectors.data ?? []).map((collector) => (
        <CollectorRow key={collector.id} collector={collector} onChange={() => void collectors.refetch()} />
      ))}
      {queries.length > 0 && (
        <Paper withBorder p="sm">
          <Stack gap="xs">
            <TextInput
              label={t("collectorName")}
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
            />
            <Select label={t("queryHandler")} data={queries} value={handler} onChange={setHandler} />
            <Textarea label={t("queryInput")} value={input} onChange={(event) => setInput(event.currentTarget.value)} />
            <TextInput
              label={t("valuePath")}
              value={valuePath}
              onChange={(event) => setValuePath(event.currentTarget.value)}
            />
            <TextInput label={t("unit")} value={unit} onChange={(event) => setUnit(event.currentTarget.value)} />
            <Group grow>
              <NumberInput
                label={t("collectionInterval")}
                value={intervalSeconds}
                min={15}
                max={86400}
                onChange={(value) => {
                  if (typeof value === "number") setIntervalSeconds(value);
                }}
              />
              <NumberInput
                label={t("retentionDays")}
                value={retentionDays}
                min={1}
                max={365}
                onChange={(value) => {
                  if (typeof value === "number") setRetentionDays(value);
                }}
              />
              <NumberInput
                label={t("maximumPoints")}
                value={maximumPoints}
                min={10}
                max={10000}
                onChange={(value) => {
                  if (typeof value === "number") setMaximumPoints(value);
                }}
              />
            </Group>
            <Checkbox
              label={t("enableCollection")}
              checked={enabled}
              onChange={(event) => setEnabled(event.currentTarget.checked)}
            />
            <Button loading={save.isPending} disabled={!name.trim() || !handler} onClick={submit}>
              {t("saveCollector")}
            </Button>
          </Stack>
        </Paper>
      )}
      {error && <Alert color="red">{error}</Alert>}
      {collectors.error && <Alert color="red">{collectors.error.message}</Alert>}
    </Stack>
  );
}

function CollectorRow({
  collector,
  onChange,
}: {
  collector: RouterOutputs["customWidget"]["package"]["collectors"][number];
  onChange(): void;
}) {
  const t = useI18n("customWidget.package");
  const save = clientApi.customWidget.package.saveCollector.useMutation();
  const remove = clientApi.customWidget.package.removeCollector.useMutation();
  const history = clientApi.widget.customApi.packageHistory.useQuery({
    itemId: collector.itemId,
    collectorId: collector.id,
    maximumPoints: 20,
  });
  const [discard, setDiscard] = useState(false);
  return (
    <Paper withBorder p="sm">
      <Stack gap="xs">
        <Text fw={500}>{collector.name}</Text>
        <Text size="xs">
          {collector.handler} · {collector.intervalSeconds}s · {collector.unit}
        </Text>
        <Text size="xs" ff="monospace">
          {collector.id}
        </Text>
        <Group>
          <Button
            variant="light"
            size="xs"
            loading={save.isPending}
            onClick={() => save.mutate({ ...collector, enabled: !collector.enabled }, { onSuccess: onChange })}
          >
            {collector.enabled ? t("pauseCollection") : t("enableCollection")}
          </Button>
          <Button variant="subtle" size="xs" onClick={() => void history.refetch()}>
            {t("refresh")}
          </Button>
        </Group>
        {history.data && <PackageHistorySummary data={history.data} />}
        <Checkbox
          checked={discard}
          onChange={(event) => setDiscard(event.currentTarget.checked)}
          label={t("discardCollectedHistory")}
        />
        <Button
          variant="subtle"
          color="red"
          disabled={!discard}
          loading={remove.isPending}
          onClick={() =>
            remove.mutate({ itemId: collector.itemId, id: collector.id, discardHistory: true }, { onSuccess: onChange })
          }
        >
          {t("removeCollector")}
        </Button>
        {save.error && <Alert color="red">{save.error.message}</Alert>}
        {remove.error && <Alert color="red">{remove.error.message}</Alert>}
        {history.error && <Alert color="red">{history.error.message}</Alert>}
      </Stack>
    </Paper>
  );
}

type History = RouterOutputs["widget"]["customApi"]["packageHistory"];

function PackageHistorySummary({ data }: { data: History }) {
  const t = useI18n("customWidget.package.historySummary");
  const latest = data.samples.at(-1);
  return (
    <Stack gap="xs">
      {latest && (
        <Group justify="space-between">
          <Text fw={600}>
            {formatCollectedValue(latest.value)} {data.unit}
          </Text>
          <Text size="xs" c="dimmed">
            {t("latest", { time: new Date(latest.timestamp).toLocaleString() })}
          </Text>
        </Group>
      )}
      {!latest && (
        <Text size="sm" c="dimmed">
          {t("empty")}
        </Text>
      )}
      {"lastError" in data && data.lastError && <Alert color="yellow">{data.lastError}</Alert>}
      <Accordion multiple>
        <Accordion.Item value="samples">
          <Accordion.Control>{t("samples", { count: data.samples.length })}</Accordion.Control>
          <Accordion.Panel>
            <div style={{ maxHeight: 220, overflow: "auto" }}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t("time")}</Table.Th>
                    <Table.Th>{t("value")}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.samples.toReversed().map((sample, index) => (
                    <Table.Tr key={`${sample.timestamp}-${index}`}>
                      <Table.Td>{new Date(sample.timestamp).toLocaleString()}</Table.Td>
                      <Table.Td>
                        {formatCollectedValue(sample.value)} {data.unit}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="technical">
          <Accordion.Control>{t("details")}</Accordion.Control>
          <Accordion.Panel>
            <Text component="pre" size="xs" style={{ whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>
              {JSON.stringify(data, null, 2)}
            </Text>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

function formatCollectedValue(value: unknown): string {
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string") return value.slice(0, 240);
  return (JSON.stringify(value) ?? "—").slice(0, 240);
}
