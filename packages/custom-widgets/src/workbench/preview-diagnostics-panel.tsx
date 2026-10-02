import { Alert, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconCheck } from "@tabler/icons-react";

import type { EditorDiagnostic } from "./analyzer";

interface PreviewDiagnosticsMessages {
  templateSize: string;
  characters: (count: number) => string;
  namedRequests: string;
  methods: string;
  networkScope: string;
  ready: string;
  diagnostic: (diagnostic: EditorDiagnostic) => string;
}

interface PreviewDiagnosticsPanelProps {
  templateLength: number;
  namedRequestCount: number;
  methods: string;
  networkScope: string;
  diagnostics: EditorDiagnostic[];
  messages: PreviewDiagnosticsMessages;
}

export function PreviewDiagnosticsPanel({
  templateLength,
  namedRequestCount,
  methods,
  networkScope,
  diagnostics,
  messages,
}: PreviewDiagnosticsPanelProps) {
  return (
    <Stack gap="xs">
      <SimpleGrid cols={2} spacing="xs">
        <DiagnosticFact label={messages.templateSize} value={messages.characters(templateLength)} />
        <DiagnosticFact label={messages.namedRequests} value={String(namedRequestCount)} />
        <DiagnosticFact label={messages.methods} value={methods} />
        <DiagnosticFact label={messages.networkScope} value={networkScope} />
      </SimpleGrid>
      {diagnostics.length === 0 ? (
        <Alert color="green" variant="light" p="xs" icon={<IconCheck size={15} />}>
          <Text size="xs">{messages.ready}</Text>
        </Alert>
      ) : (
        diagnostics.map((diagnostic, index) => (
          <Alert
            key={`${diagnostic.code}-${index}`}
            color={diagnostic.severity === "error" ? "red" : "yellow"}
            variant="light"
            p="xs"
            icon={<IconAlertTriangle size={15} />}
          >
            <Text size="xs">{messages.diagnostic(diagnostic)}</Text>
          </Alert>
        ))
      )}
    </Stack>
  );
}

function DiagnosticFact({ label, value }: { label: string; value: string }) {
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
