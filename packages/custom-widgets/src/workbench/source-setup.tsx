import { Alert, Badge, Checkbox, Group, PasswordInput, Select, Stack, Text, TextInput } from "@mantine/core";
import { IconCheck, IconKey, IconServer, IconX } from "@tabler/icons-react";

import type {
  CustomWidgetSecretKind,
  CustomWidgetSource,
  CustomWidgetSourceSetup,
  CustomWidgetSourceUrlIssue,
} from "../core";
import { getCustomWidgetSourceSetupIssue } from "../core";

export interface CustomWidgetSourceSetupValue {
  baseUrl: string;
  networkScope: CustomWidgetSource["networkScope"];
  urlConfirmed: boolean;
  secrets: Partial<Record<CustomWidgetSecretKind, string>>;
}

export interface CustomWidgetSourceSetupMessages {
  title: string;
  description: string;
  suggestedUrl: string;
  baseUrl: string;
  networkScope: string;
  authentication: string;
  confirmUrl: string;
  ready: string;
  needsUrl: string;
  credentialsMissing: string;
  credentialsOptional: string;
  configured: string;
  secret(kind: CustomWidgetSecretKind): string;
  urlError(issue: CustomWidgetSourceUrlIssue): string;
}

export interface CustomWidgetSourceSetupPanelProps {
  setups: CustomWidgetSourceSetup[];
  values: Record<string, CustomWidgetSourceSetupValue>;
  messages: CustomWidgetSourceSetupMessages;
  onChange(sourceId: string, value: CustomWidgetSourceSetupValue): void;
}

export function createCustomWidgetSourceSetupValues(
  setups: readonly CustomWidgetSourceSetup[],
): Record<string, CustomWidgetSourceSetupValue> {
  return Object.fromEntries(
    setups.map((setup) => [
      setup.sourceId,
      {
        baseUrl: setup.baseUrl,
        networkScope: setup.networkScope,
        urlConfirmed: !setup.requiresUrlConfirmation,
        secrets: {} as Partial<Record<CustomWidgetSecretKind, string>>,
      } satisfies CustomWidgetSourceSetupValue,
    ]),
  );
}

export function isCustomWidgetSourceSetupReady(
  setups: readonly CustomWidgetSourceSetup[],
  values: Record<string, CustomWidgetSourceSetupValue>,
) {
  return setups.every((setup) => {
    const value = values[setup.sourceId];
    return Boolean(value && !getCustomWidgetSourceSetupIssue(value) && value.urlConfirmed);
  });
}

export function CustomWidgetSourceSetupPanel({
  setups,
  values,
  messages,
  onChange,
}: CustomWidgetSourceSetupPanelProps) {
  if (setups.length === 0) return null;
  return (
    <Stack gap="sm">
      <Alert icon={<IconServer size={16} />}>
        <Text fw={600} size="sm">
          {messages.title}
        </Text>
        <Text size="sm">{messages.description}</Text>
      </Alert>
      {setups.map((setup) => {
        const value = values[setup.sourceId] ?? createCustomWidgetSourceSetupValues([setup])[setup.sourceId];
        if (!value) return null;
        const issue = getCustomWidgetSourceSetupIssue(value);
        const missingCredentials = setup.credentialFields.filter(
          (field) => !field.configured && !value.secrets[field.kind]?.trim(),
        );
        const urlReady = !issue && value.urlConfirmed;
        return (
          <Stack
            key={setup.sourceId}
            gap="sm"
            p="md"
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-md)",
            }}
          >
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={600}>{setup.sourceName}</Text>
                <Text size="xs" c="dimmed">
                  {setup.sourceId}
                </Text>
              </div>
              <Group gap="xs">
                <Badge
                  variant="light"
                  color={urlReady ? "green" : "red"}
                  leftSection={urlReady ? <IconCheck size={11} /> : <IconX size={11} />}
                >
                  {urlReady ? messages.ready : messages.needsUrl}
                </Badge>
                {missingCredentials.length > 0 && (
                  <Badge variant="light" color="yellow" leftSection={<IconKey size={11} />}>
                    {messages.credentialsMissing}
                  </Badge>
                )}
              </Group>
            </Group>
            <Text size="xs" c="dimmed">
              {messages.suggestedUrl}: {setup.suggestedBaseUrl}
            </Text>
            <TextInput
              label={messages.baseUrl}
              type="url"
              value={value.baseUrl}
              error={issue ? messages.urlError(issue) : undefined}
              onChange={(event) =>
                onChange(setup.sourceId, { ...value, baseUrl: event.currentTarget.value, urlConfirmed: true })
              }
            />
            <Group grow align="start">
              <Select
                label={messages.networkScope}
                data={["public", "private", "loopback"]}
                value={value.networkScope}
                allowDeselect={false}
                onChange={(networkScope) =>
                  networkScope &&
                  onChange(setup.sourceId, {
                    ...value,
                    networkScope: networkScope as CustomWidgetSource["networkScope"],
                  })
                }
              />
              <TextInput label={messages.authentication} value={setup.authType} readOnly />
            </Group>
            {setup.requiresUrlConfirmation && value.baseUrl === setup.suggestedBaseUrl && (
              <Checkbox
                checked={value.urlConfirmed}
                label={messages.confirmUrl}
                onChange={(event) => onChange(setup.sourceId, { ...value, urlConfirmed: event.currentTarget.checked })}
              />
            )}
            {setup.credentialFields.map((field) => {
              const Input = field.kind === "username" ? TextInput : PasswordInput;
              return (
                <Input
                  key={field.kind}
                  label={messages.secret(field.kind)}
                  description={field.destination}
                  value={value.secrets[field.kind] ?? ""}
                  placeholder={field.configured ? messages.configured : undefined}
                  leftSection={<IconKey size={15} />}
                  autoComplete="off"
                  onChange={(event) =>
                    onChange(setup.sourceId, {
                      ...value,
                      secrets: { ...value.secrets, [field.kind]: event.currentTarget.value },
                    })
                  }
                />
              );
            })}
            {missingCredentials.length > 0 && (
              <Text size="xs" c="yellow">
                {messages.credentialsOptional}
              </Text>
            )}
          </Stack>
        );
      })}
    </Stack>
  );
}
