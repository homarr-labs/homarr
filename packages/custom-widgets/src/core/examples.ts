import type { HomarrCustomWidgetV2Input } from "./custom-jsx-schema";

export interface CustomJsxExample {
  id: string;
  title: string;
  description: string;
  widget: HomarrCustomWidgetV2Input;
}

export const CUSTOM_JSX_STARTER = `<Stack gap="sm" p="sm">
  <Group justify="space-between"><Text fw={700}>Service status</Text><RefreshButton /></Group>
  {status.status?.loading ? <Skeleton height={72} radius="md" /> : status.status?.error ? <Alert color="red">{status.status.error}</Alert> : <Badge color={data.status?.online ? "green" : "red"}>{data.status?.online ? "Online" : "Offline"}</Badge>}
</Stack>`;

export const CUSTOM_WIDGET_STARTER: HomarrCustomWidgetV2Input = {
  $schema: "homarr-custom-widget-v2",
  name: "New custom widget",
  description: "",
  sources: { default: { name: "API", baseUrl: "https://example.com", networkScope: "public", auth: "none" } },
  requests: { status: { path: "/api/status" } },
  options: {},
  template: CUSTOM_JSX_STARTER,
};

export const customJsxExamples: readonly CustomJsxExample[] = [
  {
    id: "service-dashboard",
    title: "Service dashboard",
    description: "A polished responsive dashboard with clear loading and error states.",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Service dashboard",
      sources: {
        default: { name: "Service API", baseUrl: "https://example.com", networkScope: "public", auth: "none" },
      },
      requests: { overview: { path: "/api/overview", cacheSeconds: 30 } },
      options: {},
      template: `<Stack gap="md" p="md">
  <Group justify="space-between"><Stack gap={2}><Text fw={700}>System overview</Text><Text size="xs" c="dimmed">Live service health</Text></Stack><RefreshButton /></Group>
  {status.overview?.loading ? <Skeleton height={120} radius="lg" /> : status.overview?.error ? <Alert color="red" title="Could not load status">{status.overview.error}</Alert> : <SimpleGrid cols={{ base: 1, xs: 3 }}>{(data.overview?.services ?? []).map(service => <Paper key={service.name} withBorder p="sm" radius="md"><Group justify="space-between"><Text size="sm" fw={600}>{service.name}</Text><Badge color={service.online ? "green" : "red"} variant="light">{service.online ? "Online" : "Offline"}</Badge></Group><Text mt="xs" size="xl" fw={700}>{service.latency ?? "—"}<Text span size="xs" c="dimmed"> ms</Text></Text></Paper>)}</SimpleGrid>}
</Stack>`,
    },
  },
  {
    id: "search-and-action",
    title: "Search and action",
    description: "A temporary search input, manual query, and explicit mutation.",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Series search",
      sources: {
        default: {
          name: "Media API",
          baseUrl: "https://example.com",
          networkScope: "private",
          auth: { type: "apiKeyHeader", name: "X-Api-Key" },
        },
      },
      requests: {
        search: { path: "/api/series/search", trigger: "manual", query: { term: { $param: "query" } } },
        monitor: {
          kind: "action",
          method: "POST",
          path: "/api/series/{param:id}/monitor",
          confirmation: "Monitor this series?",
        },
      },
      options: {},
      template: `<Stack gap="sm" p="md">
  <TextInput bind="search" label="Search TV shows" placeholder="Start typing…" />
  <SubFetch requestId="search" params={{ query: inputs.search }}>
    {(results) => <Stack gap="xs">{(results ?? []).map(series => <Paper key={series.id} withBorder p="sm" radius="md"><Group justify="space-between" wrap="nowrap"><Stack gap={2}><Text fw={600}>{series.title}</Text><Text size="xs" c="dimmed">{series.year ?? "Unknown year"}</Text></Stack><ActionButton requestId="monitor" params={{ id: series.id }}>Monitor</ActionButton></Group></Paper>)}</Stack>}
  </SubFetch>
</Stack>`,
    },
  },
];
