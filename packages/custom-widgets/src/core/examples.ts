import type { HomarrCustomWidgetV2 } from "./custom-jsx-schema";

export interface CustomJsxExample {
  id: string;
  title: string;
  description: string;
  widget: HomarrCustomWidgetV2;
}

export const CUSTOM_JSX_STARTER = `<Stack gap="xs" p="sm">
  <Group justify="space-between">
    <Text fw={600}>Service status</Text>
    <Badge color={data.status === "online" ? "green" : "red"}>{data.status ?? "unknown"}</Badge>
  </Group>
  <Text size="sm" c="dimmed">Configure a load query or paste sample data to start.</Text>
</Stack>`;

export const CUSTOM_WIDGET_STARTER: HomarrCustomWidgetV2 = {
  $schema: "homarr-custom-widget-v2",
  name: "New custom widget",
  description: "",
  sources: [
    {
      id: "default",
      name: "API",
      baseUrl: "https://example.com",
      networkScope: "public",
      auth: { type: "none" },
    },
  ],
  requests: [],
  optionsSchema: { type: "object", properties: {}, additionalProperties: false },
  defaultOptions: {},
  template: CUSTOM_JSX_STARTER,
};

export const customJsxExamples: readonly CustomJsxExample[] = [
  {
    id: "service-status",
    title: "Service status",
    description: "A compact status widget backed by one load query.",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Service status",
      sources: [
        {
          id: "default",
          name: "Service API",
          baseUrl: "https://example.com",
          networkScope: "public",
          auth: { type: "none" },
        },
      ],
      requests: [
        {
          id: "status",
          sourceId: "default",
          kind: "query",
          method: "GET",
          pathTemplate: "/api/status",
          parameters: {},
          auth: "inherit",
          minimumBoardPermission: "view",
          trigger: "load",
        },
      ],
      optionsSchema: { type: "object", properties: {}, additionalProperties: false },
      defaultOptions: {},
      template: `<Stack gap="xs" p="sm">
  <Group justify="space-between">
    <Text fw={600}>{data.status.name ?? "Service"}</Text>
    <Badge color={data.status.online ? "green" : "red"}>{data.status.online ? "Online" : "Offline"}</Badge>
  </Group>
  <Text size="sm" c="dimmed">{data.status.message ?? "No additional details"}</Text>
      </Stack>`,
    },
  },
  {
    id: "pokemon-evolution-tree",
    title: "Pokémon evolution tree",
    description: "A trusted arbitrary-depth tree with one immutable derived-value block per node.",
    widget: {
      $schema: "homarr-custom-widget-v2",
      name: "Pokémon evolution tree",
      sources: [
        {
          id: "default",
          name: "PokeAPI",
          baseUrl: "https://pokeapi.co",
          networkScope: "public",
          auth: { type: "none" },
        },
      ],
      requests: [
        {
          id: "evolution",
          sourceId: "default",
          kind: "query",
          method: "GET",
          pathTemplate: "/api/v2/evolution-chain/1",
          parameters: {},
          auth: "inherit",
          minimumBoardPermission: "view",
          trigger: "load",
        },
      ],
      optionsSchema: { type: "object", properties: {}, additionalProperties: false },
      defaultOptions: {},
      template: `<Stack gap="sm" p="sm">
  <Title order={3}>Evolution chain</Title>
  {status.evolution?.loading ? <Skeleton height={160} radius="md" /> : status.evolution?.error ? <Alert color="red">{status.evolution.error}</Alert> : data.evolution?.chain ?
    <RecursiveList data={data.evolution.chain} childrenPath="evolves_to" keyPath="species.name" defaultExpandedDepth={8} showLines>
      {(node, meta) => {
        const segments = node.species.url.split("/").filter((part) => part);
        const dexId = segments.at(-1);
        return <Group gap="xs"><Badge variant="light">#{dexId}</Badge><Text tt="capitalize" fw={600}>{node.species.name}</Text>{meta.hasChildren && <Text size="xs" c="dimmed">{meta.childCount} next</Text>}</Group>;
      }}
    </RecursiveList> : <Text c="dimmed">No evolution chain returned.</Text>}
</Stack>`,
    },
  },
];
