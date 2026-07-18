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
  stateSchema: {},
  defaultState: {},
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
      stateSchema: {},
      defaultState: {},
      template: `<Stack gap="xs" p="sm">
  <Group justify="space-between">
    <Text fw={600}>{data.status.name ?? "Service"}</Text>
    <Badge color={data.status.online ? "green" : "red"}>{data.status.online ? "Online" : "Offline"}</Badge>
  </Group>
  <Text size="sm" c="dimmed">{data.status.message ?? "No additional details"}</Text>
</Stack>`,
    },
  },
];
