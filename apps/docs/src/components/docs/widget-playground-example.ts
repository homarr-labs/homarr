export const widgetPlaygroundTemplate = `<Stack gap="sm">
  <TextInput bind="name" label="Widget title" defaultValue="My server" />
  <Text fw={700}>{inputs.name || "My server"}</Text>
  <Text size="sm">{data.server.used} GB of {data.server.total} GB used</Text>
  <Progress value={data.server.used / data.server.total * 100} aria-label="Storage used" />
</Stack>`;

export const widgetPlaygroundData = { server: { used: 36, total: 100 } };
