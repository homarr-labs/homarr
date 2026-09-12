"use client";

import { Accordion, Alert, Group, Stack, Table, Text } from "@mantine/core";
import type { RouterOutputs } from "@homarr/api";
import { useI18n } from "@homarr/translation/client";

type History = RouterOutputs["widget"]["customApi"]["packageHistory"];

export function PackageHistorySummary({ data }: { data: History }) {
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
