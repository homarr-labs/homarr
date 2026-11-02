import "server-only";

import { readArenaDataset } from "./_dataset";
import type { BlindDataset } from "./_review";

export async function readSmokeDataset(unavailable = false): Promise<BlindDataset> {
  const { dataset } = await readArenaDataset();
  const fixture = dataset.cases.find(({ id }) => id === "event-feed");
  if (!fixture) throw new Error("Smoke fixture unavailable");
  const requests = {
    events: {
      source: "default",
      kind: "query" as const,
      method: "GET" as const,
      path: "/fixtures/events",
      trigger: "load" as const,
      permission: "view" as const,
      auth: "inherit" as const,
    },
    filteredEvents: {
      source: "default",
      kind: "query" as const,
      method: "GET" as const,
      path: "/fixtures/events/filter",
      trigger: "manual" as const,
      permission: "view" as const,
      auth: "inherit" as const,
    },
    acknowledge: {
      source: "default",
      kind: "action" as const,
      method: "POST" as const,
      path: "/fixtures/acknowledge",
      trigger: "manual" as const,
      permission: "modify" as const,
      auth: "inherit" as const,
      confirmation: "Simulate acknowledgement?",
    },
  };
  const template = `<Stack gap="xs"><Group justify="space-between"><Text fw={700}>Activity</Text><RefreshButton requestId="events" /></Group><Text size="xs" c="dimmed">Hand-authored runtime smoke · not model output</Text>{status.events.loading ? <Text>Loading simulated data</Text> : status.events.ok === false ? <Text>Simulated request failed</Text> : data.events.events.length === 0 ? <Text>No activity</Text> : data.events.events.map((event) => <Paper key={event.id} withBorder p="xs"><Group justify="space-between"><Text fw={600}>{event.name}</Text><Text size="xs">{event.category}</Text></Group></Paper>)}<Select label="Category" bind="category" defaultValue="all" data={["all"].concat((data.events?.events ?? []).map((event) => event.category))} /><SubFetch requestId="filteredEvents" trigger="manual" params={{category: inputs.category ?? "all"}}>{(result) => <Stack gap="xs">{result.events.map((event) => <Text key={event.id}>{event.name}</Text>)}</Stack>}</SubFetch><ActionButton requestId="acknowledge" label="Simulate acknowledgement" size="xs" confirmMessage="Simulate acknowledgement?" /></Stack>`;
  return {
    smoke: true,
    hash: `hand-authored-runtime-smoke-${unavailable ? "unavailable-" : ""}v1`,
    reviewer: dataset.reviewer,
    cases: [
      {
        ...fixture,
        responses: { ...fixture.responses, acknowledge: { accepted: true } },
        emptyResponses: { ...fixture.emptyResponses, acknowledge: { accepted: true } },
      },
    ],
    candidates: ["62b07e62f0a94033", "768de02adc594079"].map((id, index) => ({
      id,
      caseId: fixture.id,
      status: "ready",
      definition: { template: unavailable && index === 0 ? "<Text>{unknownFunction()}</Text>" : template, requests },
    })),
    matches: [{ id: "546968e762b74a00", caseId: fixture.id, leftId: "62b07e62f0a94033", rightId: "768de02adc594079" }],
  };
}
