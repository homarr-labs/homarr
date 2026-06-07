"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Code,
  Collapse,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconChevronDown, IconChevronUp, IconExternalLink, IconPlayerPlay } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import { displayComponents } from "@homarr/widgets/custom-api/component";

interface PreviewInput {
  baseUrl: string;
  endpoint: string;
  method: string;
  authType: string;
  headerName?: string;
  requestBody?: string;
  displayType: string;
  displayConfig: Record<string, unknown>;
  secrets: Array<{ kind: string; value: string }>;
  definitionId?: string;
}

interface CustomWidgetPreviewProps {
  getFormValues: () => PreviewInput;
  refreshSignal?: number;
}

export function CustomWidgetPreview({ getFormValues, refreshSignal }: CustomWidgetPreviewProps) {
  const t = useScopedI18n("customWidget");
  const previewMutation = clientApi.customWidget.preview.useMutation();
  const [rawOpen, { toggle: toggleRaw }] = useDisclosure(false);
  const [result, setResult] = useState<typeof previewMutation.data>(undefined);
  const hasTestedRef = useRef(false);

  const handleTest = async () => {
    const values = getFormValues();
    if (!values.baseUrl || !values.endpoint) return;
    const res = await previewMutation.mutateAsync(values);
    setResult(res);
    hasTestedRef.current = true;
  };

  useEffect(() => {
    if (refreshSignal && refreshSignal > 0 && hasTestedRef.current) {
      void handleTest();
    }
  }, [refreshSignal]);

  return (
    <Card withBorder shadow="sm" p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Title order={5}>{t("preview.title")}</Title>
          <Button
            size="xs"
            variant="light"
            leftSection={previewMutation.isPending ? <Loader size={14} /> : <IconPlayerPlay size={14} />}
            onClick={handleTest}
            loading={previewMutation.isPending}
          >
            {t("preview.test")}
          </Button>
        </Group>

        {previewMutation.error && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} p="xs">
            <Text size="xs">{previewMutation.error.message}</Text>
          </Alert>
        )}

        {result && !result.success && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} p="xs">
            <Text size="xs" fw={500}>{result.error}</Text>
            {result.responseInfo && (
              <Badge size="xs" color="red" variant="light" mt={4}>
                {result.responseInfo.status} {result.responseInfo.statusText}
              </Badge>
            )}
          </Alert>
        )}

        {result?.success && (
          <Stack gap="xs">
            <Group gap="xs">
              <Badge size="xs" color="green" variant="light">
                {result.responseInfo.status} {result.responseInfo.statusText}
              </Badge>
            </Group>

            <Card withBorder p="xs" bg="var(--mantine-color-dark-7)" mih={120}>
              <PreviewDisplay data={result.displayData} />
            </Card>

            <Group gap={4}>
              <ActionIcon size="xs" variant="subtle" onClick={toggleRaw}>
                {rawOpen ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
              </ActionIcon>
              <Text size="xs" c="dimmed" style={{ cursor: "pointer" }} onClick={toggleRaw}>
                {t("preview.rawResponse")}
              </Text>
              {rawOpen && (
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  ml="auto"
                  onClick={() => {
                    const blob = new Blob([result.rawResponse], { type: "application/json" });
                    window.open(URL.createObjectURL(blob));
                  }}
                >
                  <IconExternalLink size={12} />
                </ActionIcon>
              )}
            </Group>
            <Collapse expanded={rawOpen}>
              <ScrollArea mah={200}>
                <Code block style={{ fontSize: 12 }}>
                  {result.rawResponse}
                </Code>
              </ScrollArea>
            </Collapse>
          </Stack>
        )}

        {!result && !previewMutation.error && !previewMutation.isPending && (
          <Text size="xs" c="dimmed" ta="center">{t("preview.hint")}</Text>
        )}
      </Stack>
    </Card>
  );
}

function PreviewDisplay({ data }: { data: unknown }) {
  const typed = data as Record<string, unknown>;
  if (!typed || typeof typed !== "object") {
    return <Text size="xs" c="dimmed">No data</Text>;
  }

  const dataType = typed.type as string | undefined;

  if (dataType === "actionButton") {
    return (
      <Center p="sm">
        <Button size="sm" color={(typed.buttonColor as string) ?? "blue"} disabled>
          {(typed.buttonLabel as string) ?? "Execute"}
        </Button>
      </Center>
    );
  }

  if (dataType && displayComponents[dataType]) {
    const Component = displayComponents[dataType]!;
    return <Component data={typed} />;
  }

  return (
    <ScrollArea h={100}>
      <Code block style={{ fontSize: 11 }}>{JSON.stringify(data, null, 2)}</Code>
    </ScrollArea>
  );
}
