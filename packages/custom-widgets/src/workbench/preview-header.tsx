import { Alert, Badge, Button, Group, Loader, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconInfoCircle, IconPlayerPlay } from "@tabler/icons-react";

interface PreviewHeaderMessages {
  title: string;
  test: string;
  mutationDisabled: string;
  staleTitle: string;
  staleDescription: string;
}

interface PreviewHeaderProps {
  method: string;
  url: string;
  isTesting: boolean;
  isSampleStale: boolean;
  testError?: string | null;
  responseError?: string;
  responseStatus?: { status: number; statusText: string } | null;
  onTest: () => void;
  messages: PreviewHeaderMessages;
}

export function PreviewHeader({
  method,
  url,
  isTesting,
  isSampleStale,
  testError,
  responseError,
  responseStatus,
  onTest,
  messages,
}: PreviewHeaderProps) {
  return (
    <>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Title order={5}>{messages.title}</Title>
        <Button
          type="button"
          size="xs"
          variant="light"
          leftSection={isTesting ? <Loader size={14} /> : <IconPlayerPlay size={14} />}
          onClick={onTest}
          loading={isTesting}
          disabled={method !== "GET" || !url}
        >
          {messages.test}
        </Button>
      </Group>
      {method !== "GET" && (
        <Alert color="yellow" variant="light" p="xs" icon={<IconInfoCircle size={15} />}>
          <Text size="xs">{messages.mutationDisabled}</Text>
        </Alert>
      )}
      {isSampleStale && (
        <Alert color="yellow" variant="light" p="xs" icon={<IconAlertTriangle size={15} />}>
          <Text size="xs" fw={600}>
            {messages.staleTitle}
          </Text>
          <Text size="xs">{messages.staleDescription}</Text>
        </Alert>
      )}
      {testError && (
        <Alert color="red" icon={<IconAlertTriangle size={16} />} p="xs">
          <Text size="xs">{testError}</Text>
        </Alert>
      )}
      {responseError && (
        <Alert color="red" icon={<IconAlertTriangle size={16} />} p="xs">
          <Text size="xs" fw={500}>
            {responseError}
          </Text>
          {responseStatus && (
            <Badge size="xs" color="red" variant="light" mt={4}>
              {responseStatus.status} {responseStatus.statusText}
            </Badge>
          )}
        </Alert>
      )}
    </>
  );
}
