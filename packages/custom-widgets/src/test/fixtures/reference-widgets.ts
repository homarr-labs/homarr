import type { HomarrCustomWidgetV2Input } from "../../core/custom-jsx-schema";

export const PORTAINER_REFERENCE_WIDGET: HomarrCustomWidgetV2Input = {
  $schema: "homarr-custom-widget-v2",
  name: "Portainer containers",
  description: "Monitor and control Docker containers through Portainer.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/portainer.svg",
  sources: {
    default: {
      name: "Portainer",
      baseUrl: "https://portainer.example.com",
      networkScope: "private",
      auth: { type: "apiKeyHeader", name: "X-API-Key" },
    },
  },
  requests: {
    containers: {
      path: "/api/endpoints/{option:endpointId}/docker/containers/json",
      query: { all: { $option: "showAll" } },
      cacheSeconds: 20,
    },
    start: {
      kind: "action",
      method: "POST",
      path: "/api/endpoints/{option:endpointId}/docker/containers/{param:id}/start",
      confirmation: "Start this container?",
      invalidates: ["containers"],
    },
    stop: {
      kind: "action",
      method: "POST",
      path: "/api/endpoints/{option:endpointId}/docker/containers/{param:id}/stop",
      confirmation: { title: "Stop container", message: "The service will become unavailable.", destructive: true },
      invalidates: ["containers"],
    },
    restart: {
      kind: "action",
      method: "POST",
      path: "/api/endpoints/{option:endpointId}/docker/containers/{param:id}/restart",
      confirmation: "Restart this container?",
      invalidates: ["containers"],
    },
  },
  options: {
    endpointId: { label: "Environment ID", control: "number", default: 2, min: 1 },
    showAll: { label: "Include stopped containers", control: "switch", default: true },
  },
  template: `<Stack gap="md" p="md" h="100%">
  <Group justify="space-between" align="flex-start">
    <Stack gap={2}><Group gap="xs"><ThemeIcon color="blue" variant="light"><Icon name="brand-docker" /></ThemeIcon><Title order={3}>Containers</Title></Group><Text size="xs" c="dimmed">Portainer environment {options.endpointId}</Text></Stack>
    <RefreshButton />
  </Group>
  {status.containers?.loading ? <Stack gap="xs"><Skeleton height={68} radius="md" /><Skeleton height={68} radius="md" /><Skeleton height={68} radius="md" /></Stack> : status.containers?.error ? <Alert color="red" title="Portainer is unavailable">{status.containers.error}</Alert> : (data.containers ?? []).length === 0 ? <Alert color="gray" title="No containers">No containers matched this environment.</Alert> : <Stack gap="md">
    <SimpleGrid cols={{ base: 1, xs: 3 }}>
      <Paper withBorder p="sm" radius="md"><Text size="xs" c="dimmed">Total</Text><Text size="xl" fw={700}>{data.containers.length}</Text></Paper>
      <Paper withBorder p="sm" radius="md"><Text size="xs" c="dimmed">Running</Text><Text size="xl" fw={700} c="green">{data.containers.filter(container => container.State === "running").length}</Text></Paper>
      <Paper withBorder p="sm" radius="md"><Text size="xs" c="dimmed">Stopped</Text><Text size="xl" fw={700} c="dimmed">{data.containers.filter(container => container.State !== "running").length}</Text></Paper>
    </SimpleGrid>
    <ScrollArea h={230} type="auto"><Stack gap="xs">{data.containers.map(container => <Paper key={container.Id} withBorder p="sm" radius="md"><Group justify="space-between" align="flex-start" wrap="wrap"><Stack gap={3}><Group gap="xs"><Text fw={650}>{container.Names?.[0]?.replace("/", "") ?? container.Id.slice(0, 12)}</Text><Badge color={container.State === "running" ? "green" : "gray"} variant="light">{container.State}</Badge></Group><Text size="xs" c="dimmed" lineClamp={1}>{container.Image}</Text><Text size="xs" c="dimmed">{container.Status}</Text></Stack><Group gap="xs">{container.State === "running" ? <ActionButton requestId="stop" params={{ id: container.Id }} color="red" variant="light">Stop</ActionButton> : <ActionButton requestId="start" params={{ id: container.Id }} color="green" variant="light">Start</ActionButton>}<ActionButton requestId="restart" params={{ id: container.Id }} variant="light">Restart</ActionButton></Group></Group></Paper>)}</Stack></ScrollArea>
  </Stack>}
</Stack>`,
};
