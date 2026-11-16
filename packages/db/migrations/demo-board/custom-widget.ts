import { customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";

// Static example data demonstrates the real Custom JSX runtime without an upstream request.
export const demoCustomWidget = customWidgetDefinitionSchema.parse({
  $schema: "homarr-custom-widget-v2",
  name: "Maintenance checks",
  description: "A local Custom JSX example with an editable title and four sample maintenance checks.",
  sources: { default: { name: "Static example", baseUrl: "https://example.com", auth: "none" } },
  requests: {},
  options: { title: { label: "Title", control: "text", default: "Maintenance checks" } },
  template: `<Stack p="md" gap="sm">
  <Group justify="space-between" wrap="wrap">
    <Text fw={600}>{options.title}</Text>
    <Badge variant="light" color="primaryColor">3 of 4 complete</Badge>
  </Group>
  <Progress aria-label="Scheduled checks completed" value={75} color="primaryColor" />
  <Stack gap={6}>
    {[{ name: "Database backup", state: "Verified" }, { name: "Off-site copy", state: "Verified" }, { name: "Restore check", state: "Verified" }, { name: "UPS check", state: "Scheduled" }].map(check => <Group key={check.name} justify="space-between" wrap="wrap"><Text size="sm">{check.name}</Text><Text size="xs" c="dimmed">{check.state}</Text></Group>)}
  </Stack>
  <Text size="xs" c="dimmed">Custom JSX · local example data. Change the title in widget options.</Text>
</Stack>`,
});
