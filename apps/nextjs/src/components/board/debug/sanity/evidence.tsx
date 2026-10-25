"use client";

import { useState } from "react";
import { Alert, Badge, Group, Paper, Stack, Table, Tabs, Text } from "@mantine/core";

import type { SanityCapture, SanityCheck, SanityReport, SanityScenario } from "@homarr/boards/sanity-report";

import { SnapshotInspector } from "./snapshot-inspector";
import classes from "./workbench.module.css";

function Capture({ capture, label, scenario }: { capture: SanityCapture; label: string; scenario: SanityScenario }) {
  return (
    <Stack gap="xs">
      <figure className={classes.capture}>
        <figcaption>
          <span>{label}</span>
          <span>
            Viewport {scenario.viewport.width} × {scenario.viewport.height}px
          </span>
        </figcaption>
        {capture.image && (
          <img
            src={capture.image}
            width={scenario.viewport.width}
            height={scenario.viewport.height}
            alt={`${label}: ${scenario.title}`}
            className={classes.captureImage}
          />
        )}
        {!capture.image && (
          <Text p="lg" c="dimmed">
            No screenshot was captured.
          </Text>
        )}
      </figure>
      {capture.error && (
        <Alert color="red" title={`${label} run error`}>
          {capture.error}
        </Alert>
      )}
      {capture.snapshot && <SnapshotInspector text={capture.snapshot} label={label} />}
    </Stack>
  );
}

function Difference({ scenario }: { scenario: SanityScenario }) {
  const [beforeDimensions, setBeforeDimensions] = useState<string | null>(null);
  const [afterDimensions, setAfterDimensions] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  if (!scenario.before.image || !scenario.after.image) {
    return <Alert color="orange">Both captures are required to display their difference.</Alert>;
  }
  if (imageError) return <Alert color="orange">A captured PNG could not be decoded.</Alert>;
  if (beforeDimensions && afterDimensions && beforeDimensions !== afterDimensions) {
    return (
      <Alert color="orange" title="Capture dimensions changed">
        Before is {beforeDimensions}px; after is {afterDimensions}px. Use the before / after view to inspect overflow. A
        difference overlay requires matching image dimensions.
      </Alert>
    );
  }
  return (
    <Stack gap="xs">
      <figure className={classes.capture}>
        <figcaption>
          <span>Difference overlay</span>
          <span>
            Viewport {scenario.viewport.width} × {scenario.viewport.height}px
          </span>
        </figcaption>
        <div className={classes.difference} data-ready={Boolean(beforeDimensions && afterDimensions)}>
          <img
            src={scenario.before.image}
            width={scenario.viewport.width}
            height={scenario.viewport.height}
            alt={`Before: ${scenario.title}`}
            className={classes.captureImage}
            onLoad={(event) =>
              setBeforeDimensions(`${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight}`)
            }
            onError={() => setImageError(true)}
          />
          <img
            src={scenario.after.image}
            width={scenario.viewport.width}
            height={scenario.viewport.height}
            alt={`After: ${scenario.title}, overlaid with difference blending`}
            className={classes.differenceImage}
            onLoad={(event) =>
              setAfterDimensions(`${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight}`)
            }
            onError={() => setImageError(true)}
          />
        </div>
      </figure>
      <Text size="xs" c="dimmed">
        Black areas match. Colored areas changed. This overlay helps inspect the supplied captures; it does not decide
        whether a change is acceptable.
      </Text>
    </Stack>
  );
}

function CheckValue({ check }: { check: SanityCheck | undefined }) {
  if (!check)
    return (
      <Text size="xs" c="dimmed">
        Not recorded
      </Text>
    );
  let color = "teal";
  let label = "Passed";
  if (check.status === "failed") {
    color = "red";
    label = "Failed";
  }
  return (
    <Stack gap={4}>
      <Badge color={color} size="xs" variant="light">
        {label}
      </Badge>
      <Text size="xs">
        <strong>Expected:</strong> {check.expected}
      </Text>
      <Text size="xs">
        <strong>Observed:</strong> {check.observed}
      </Text>
    </Stack>
  );
}

export function ScenarioEvidence({ scenario, report }: { scenario: SanityScenario; report: SanityReport }) {
  const beforeChecks = new Map(scenario.before.checks.map((check) => [check.id, check]));
  const afterChecks = new Map(scenario.after.checks.map((check) => [check.id, check]));
  const checkIds = [...new Set([...afterChecks.keys(), ...beforeChecks.keys()])];
  return (
    <Stack gap="lg">
      <Tabs defaultValue="pair" keepMounted={false}>
        <Tabs.List aria-label="Recorded evidence view" mb="md">
          <Tabs.Tab value="pair">Before / after</Tabs.Tab>
          <Tabs.Tab value="difference">Difference</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="pair">
          <div className={classes.capturePair}>
            <Capture capture={scenario.before} label="Before" scenario={scenario} />
            <Capture capture={scenario.after} label="After" scenario={scenario} />
          </div>
          <Group justify="space-between" mt="xs">
            <Text size="xs" c="dimmed">
              Before · {report.base.label} · {report.base.sourceSha.slice(0, 12)}
            </Text>
            <Text size="xs" c="dimmed">
              After · {report.candidate.label} · {report.candidate.sourceSha.slice(0, 12)}
            </Text>
          </Group>
        </Tabs.Panel>
        <Tabs.Panel value="difference">
          <Difference scenario={scenario} />
        </Tabs.Panel>
      </Tabs>
      <Paper withBorder p="md">
        <Text fw={600} size="sm" mb="sm">
          Behavior checks
        </Text>
        {checkIds.length === 0 && (
          <Text c="dimmed" size="sm">
            No assertions were recorded for this scenario.
          </Text>
        )}
        {checkIds.length > 0 && (
          <Table.ScrollContainer minWidth={560}>
            <Table verticalSpacing="sm" className={classes.checkTable}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Contract</Table.Th>
                  <Table.Th>Before</Table.Th>
                  <Table.Th>After</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {checkIds.map((id) => (
                  <Table.Tr key={id}>
                    <Table.Td>{afterChecks.get(id)?.label ?? beforeChecks.get(id)?.label}</Table.Td>
                    <Table.Td>
                      <CheckValue check={beforeChecks.get(id)} />
                    </Table.Td>
                    <Table.Td>
                      <CheckValue check={afterChecks.get(id)} />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>
    </Stack>
  );
}
