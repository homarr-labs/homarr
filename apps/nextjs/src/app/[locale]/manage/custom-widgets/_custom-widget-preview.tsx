"use client";

import { useMemo } from "react";
import { Alert, Badge, Button, Card, Center, Code, Group, Loader, ScrollArea, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconExternalLink, IconPlayerPlay } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";
import { extractDisplayData } from "@homarr/widgets/custom-api/extract-display-data";

import { displayComponents } from "@homarr/widgets/custom-api/component";

interface PreviewInput {
  url: string;
  method: string;
  authType: string;
  headerName?: string;
  requestBody?: string;
  displayType: string;
  displayConfig: Record<string, unknown>;
  secrets: Array<{ kind: string; value: string }>;
  definitionId?: string;
}

export interface PreviewFetchResult {
  success: boolean;
  error?: string;
  responseInfo: { status: number; statusText: string } | null;
  rawResponse: string | null;
}

interface CustomWidgetPreviewProps {
  getFormValues: () => PreviewInput;
  formValues: PreviewInput;
  fetchResult: PreviewFetchResult | null;
  cachedJson: unknown;
  onTest: () => void;
  isTesting: boolean;
  testError?: string | null;
}

export function CustomWidgetPreview({
  getFormValues,
  formValues,
  fetchResult,
  cachedJson,
  onTest,
  isTesting,
  testError,
}: CustomWidgetPreviewProps) {
  const t = useScopedI18n("customWidget");

  const displayData = useMemo((): Record<string, unknown> | null => {
    const { displayType, displayConfig } = formValues;
    if (displayType === "actionButton") {
      return extractDisplayData(null, displayType, displayConfig) as Record<string, unknown>;
    }
    if (!fetchResult?.success || cachedJson == null) return null;
    return extractDisplayData(cachedJson, displayType, displayConfig) as Record<string, unknown>;
  }, [fetchResult?.success, cachedJson, formValues]);

  const handleTest = () => {
    const values = getFormValues();
    if (!values.url) return;
    onTest();
  };

  return (
    <Card withBorder shadow="sm" p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Title order={5}>{t("preview.title")}</Title>
          <Button
            size="xs"
            variant="light"
            leftSection={isTesting ? <Loader size={14} /> : <IconPlayerPlay size={14} />}
            onClick={handleTest}
            loading={isTesting}
          >
            {t("preview.test")}
          </Button>
        </Group>

        {testError && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} p="xs">
            <Text size="xs">{testError}</Text>
          </Alert>
        )}

        {fetchResult && !fetchResult.success && (
          <Alert color="red" icon={<IconAlertTriangle size={16} />} p="xs">
            <Text size="xs" fw={500}>
              {fetchResult.error}
            </Text>
            {fetchResult.responseInfo && (
              <Badge size="xs" color="red" variant="light" mt={4}>
                {fetchResult.responseInfo.status} {fetchResult.responseInfo.statusText}
              </Badge>
            )}
          </Alert>
        )}

        {displayData && (formValues.displayType === "actionButton" || fetchResult?.success) && (
          <Stack gap="xs">
            {fetchResult?.success && (
              <Group gap="xs">
                <Badge size="xs" color="green" variant="light">
                  {fetchResult.responseInfo?.status} {fetchResult.responseInfo?.statusText}
                </Badge>
              </Group>
            )}

            <Card withBorder p="xs" bg="var(--mantine-color-dark-7)" mah={320} style={{ overflow: "auto" }}>
              <PreviewDisplay data={displayData} />
            </Card>

            {fetchResult?.success && fetchResult.rawResponse && (
              <Button
                size="xs"
                variant="subtle"
                leftSection={<IconExternalLink size={14} />}
                onClick={() => {
                  const blob = new Blob([fetchResult.rawResponse ?? ""], {
                    type: "application/json",
                  });
                  const blobUrl = URL.createObjectURL(blob);
                  window.open(blobUrl);
                  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
                }}
              >
                {t("preview.rawResponse")}
              </Button>
            )}
          </Stack>
        )}

        {!displayData && !testError && !isTesting && (
          <Text size="xs" c="dimmed" ta="center">
            {t("preview.hint")}
          </Text>
        )}
      </Stack>
    </Card>
  );
}

function PreviewDisplay({ data }: { data: unknown }) {
  const typed = data as Record<string, unknown>;
  if (!typed || typeof typed !== "object") {
    return (
      <Text size="xs" c="dimmed">
        No data
      </Text>
    );
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

  const Component = dataType ? displayComponents[dataType] : undefined;
  if (Component) {
    return <Component data={typed} />;
  }

  return (
    <ScrollArea h={100}>
      <Code block style={{ fontSize: 11 }}>
        {JSON.stringify(data, null, 2)}
      </Code>
    </ScrollArea>
  );
}
