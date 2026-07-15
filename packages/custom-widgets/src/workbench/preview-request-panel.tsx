import { Alert, Badge, Group, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconClipboard } from "@tabler/icons-react";

export interface PreviewNamedRequest {
  id: string;
  kind: "query" | "action";
  method: string;
  pathTemplate: string;
  minimumBoardPermission?: string;
}

export interface PreviewJournalEntry {
  id: string;
  requestId: string;
  method: string;
  pathTemplate: string;
  simulated: boolean;
  status: number | null;
  durationMs: number;
}

interface PreviewRequestPanelMessages {
  method: string;
  authentication: string;
  endpoint: string;
  status: string;
  notRun: string;
  named: string;
  journal: string;
  journalEmpty: string;
  simulated: string;
  redacted: string;
  permission: (permission: string) => string;
  duration: (duration: number) => string;
}

interface PreviewRequestPanelProps {
  method: string;
  authentication: string;
  endpoint: string;
  status?: number;
  namedRequests: PreviewNamedRequest[];
  journal?: PreviewJournalEntry[];
  methodColor: (method: string) => string;
  messages: PreviewRequestPanelMessages;
}

const journalColor = ({ simulated, status }: PreviewJournalEntry): string => {
  if (simulated) return "yellow";
  if (status !== null && status >= 200 && status < 400) return "green";
  return "red";
};

export function PreviewRequestPanel({
  method,
  authentication,
  endpoint,
  status,
  namedRequests,
  journal,
  methodColor,
  messages,
}: PreviewRequestPanelProps) {
  return (
    <Stack gap="sm">
      <SimpleGrid cols={2} spacing="xs">
        <RequestFact label={messages.method} value={method} />
        <RequestFact label={messages.authentication} value={authentication} />
        <RequestFact label={messages.endpoint} value={endpoint} />
        <RequestFact label={messages.status} value={status === undefined ? messages.notRun : String(status)} />
      </SimpleGrid>
      {namedRequests.length > 0 && (
        <Stack gap={6}>
          <Text size="xs" fw={600}>
            {messages.named}
          </Text>
          {namedRequests.map((request) => (
            <Paper key={request.id} withBorder p="xs">
              <Group justify="space-between" wrap="nowrap">
                <div>
                  <Text size="xs" fw={600} ff="monospace">
                    {request.id}
                  </Text>
                  <Text size="xs" c="dimmed" ff="monospace" lineClamp={1}>
                    {request.pathTemplate}
                  </Text>
                </div>
                <Group gap={4} wrap="nowrap">
                  <Badge size="xs" variant="light" color={methodColor(request.method)}>
                    {request.method}
                  </Badge>
                  <Badge size="xs" variant="light" color="gray">
                    {messages.permission(request.minimumBoardPermission ?? "view")}
                  </Badge>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
      {journal && journal.length > 0 ? (
        <Stack gap={6}>
          <Text size="xs" fw={600}>
            {messages.journal}
          </Text>
          {journal.map((entry) => (
            <Paper key={entry.id} withBorder p="xs">
              <Group justify="space-between" wrap="nowrap">
                <div style={{ minWidth: 0 }}>
                  <Text size="xs" fw={600} ff="monospace">
                    {entry.requestId}
                  </Text>
                  <Text size="xs" c="dimmed" ff="monospace" truncate>
                    {entry.pathTemplate}
                  </Text>
                </div>
                <Group gap={4} wrap="nowrap">
                  <Badge size="xs" color={methodColor(entry.method)} variant="light">
                    {entry.method}
                  </Badge>
                  <Badge size="xs" color={journalColor(entry)}>
                    {entry.simulated ? messages.simulated : (entry.status ?? "—")}
                  </Badge>
                  <Text size="xs" c="dimmed" w={56} ta="right">
                    {messages.duration(entry.durationMs)}
                  </Text>
                </Group>
              </Group>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Text size="xs" c="dimmed">
          {messages.journalEmpty}
        </Text>
      )}
      <Alert color="blue" variant="light" p="xs" icon={<IconClipboard size={15} />}>
        <Text size="xs">{messages.redacted}</Text>
      </Alert>
    </Stack>
  );
}

function RequestFact({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="xs">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="xs" fw={600} lineClamp={2}>
        {value || "—"}
      </Text>
    </Paper>
  );
}
