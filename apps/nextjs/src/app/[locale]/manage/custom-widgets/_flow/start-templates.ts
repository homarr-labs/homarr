/** Starter JSX uses named references so its initial graph already explains the data flow. */
export function createHttpStarterTemplate(requestId: string, title: string, setupHint: string) {
  const request = JSON.stringify(requestId);
  const data = `data[${request}]`;
  const status = `status[${request}]`;
  return `<Stack gap="sm" p="sm">
  <Group justify="space-between"><Text fw={600}>{${JSON.stringify(title)}}</Text><RefreshButton /></Group>
  {${status}?.loading ? <Skeleton height={100} /> : ${status}?.error ? <Alert color="red">{${status}.error}</Alert> : (${data} ?? null) === null ? <Text c="dimmed">{${JSON.stringify(setupHint)}}</Text> : <Code block>{JSON.stringify(${data})}</Code>}
</Stack>`;
}
