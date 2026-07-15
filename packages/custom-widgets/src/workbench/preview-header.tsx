import { Alert, Badge, Button, Group, Loader, Popover, Stack, Switch, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconInfoCircle, IconNetwork, IconPlayerPlay } from "@tabler/icons-react";

interface PreviewHeaderMessages {
  title: string;
  interactive: string;
  capabilitiesTitle: string;
  capabilitiesDescription: string;
  liveActions: string;
  liveActionsDescription: string;
  runTestFirst: string;
  simulated: string;
  test: string;
  mutationDisabled: string;
  staleTitle: string;
  staleDescription: string;
}

interface PreviewHeaderProps {
  method: string;
  url: string;
  methods: string[];
  hasNamedActions: boolean;
  hasPreviewSession: boolean;
  liveActions: boolean;
  isUpdatingLiveActions: boolean;
  isTesting: boolean;
  isSampleStale: boolean;
  testError?: string | null;
  responseError?: string;
  responseStatus?: { status: number; statusText: string } | null;
  onTest: () => void;
  onSetLiveActions?: (enabled: boolean) => void;
  methodColor: (method: string) => string;
  messages: PreviewHeaderMessages;
}

export function PreviewHeader({
  method,
  url,
  methods,
  hasNamedActions,
  hasPreviewSession,
  liveActions,
  isUpdatingLiveActions,
  isTesting,
  isSampleStale,
  testError,
  responseError,
  responseStatus,
  onTest,
  onSetLiveActions,
  methodColor,
  messages,
}: PreviewHeaderProps) {
  return (
    <>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Title order={5}>{messages.title}</Title>
          {methods.length > 0 && (
            <Popover width={300} position="bottom" withinPortal shadow="md">
              <Popover.Target>
                <Button
                  type="button"
                  size="compact-xs"
                  variant="subtle"
                  color="gray"
                  leftSection={<IconNetwork size={14} />}
                >
                  {messages.interactive}
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="xs">
                  <Text size="sm" fw={600}>
                    {messages.capabilitiesTitle}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {messages.capabilitiesDescription}
                  </Text>
                  <Group gap={4}>
                    {methods.map((requestMethod) => (
                      <Badge key={requestMethod} size="xs" color={methodColor(requestMethod)} variant="light">
                        {requestMethod}
                      </Badge>
                    ))}
                  </Group>
                  {hasNamedActions && (
                    <Stack gap={4} mt="xs">
                      <Switch
                        label={messages.liveActions}
                        description={hasPreviewSession ? messages.liveActionsDescription : messages.runTestFirst}
                        checked={liveActions}
                        disabled={!hasPreviewSession || !onSetLiveActions || isUpdatingLiveActions}
                        onChange={(event) => onSetLiveActions?.(event.currentTarget.checked)}
                      />
                      {!liveActions && (
                        <Badge size="xs" color="yellow" variant="light" style={{ alignSelf: "flex-start" }}>
                          {messages.simulated}
                        </Badge>
                      )}
                    </Stack>
                  )}
                </Stack>
              </Popover.Dropdown>
            </Popover>
          )}
        </Group>
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
