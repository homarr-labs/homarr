import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  Alert,
  Anchor,
  Button,
  Fieldset,
  Group,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconExternalLink, IconKey, IconPlugConnected, IconX } from "@tabler/icons-react";

import { isOnboardingAuthorityError } from "./errors";
import type { IntegrationDraft, OnboardingClient, OnboardingSource } from "./types";

export interface EditableIntegration<Kind extends string, Secret extends string> extends IntegrationDraft<
  Kind,
  Secret
> {
  source: "manual" | "docker";
  urlOverridden: boolean;
  secretOption: number;
}

export function IntegrationConnections<Kind extends string, Secret extends string, Locale extends string>({
  drafts,
  source,
  client,
  update,
  onAuthorityFailure,
}: {
  drafts: EditableIntegration<Kind, Secret>[];
  source: OnboardingSource<Kind, Secret, Locale>;
  client: OnboardingClient<Kind, Secret> | null;
  update(id: string, patch: Partial<EditableIntegration<Kind, Secret>>): void;
  onAuthorityFailure?(): void;
}) {
  const t = source.t;
  return (
    <Fieldset legend={t("init.studio.connect.configureIntegrations")}>
      {drafts.length === 0 ? (
        <Alert variant="light" icon={<IconPlugConnected size={18} />}>
          {t("init.studio.connect.empty")}
        </Alert>
      ) : (
        <Accordion
          className={source.presentation.classes.integrationAccordion}
          variant="separated"
          multiple
          order={3}
          defaultValue={drafts.slice(0, 1).map((draft) => draft.sourceId)}
          transitionDuration={0}
        >
          {drafts.map((draft) => (
            <IntegrationEditor
              key={draft.sourceId}
              draft={draft}
              source={source}
              client={client}
              update={(patch) => update(draft.sourceId, patch)}
              onAuthorityFailure={onAuthorityFailure}
            />
          ))}
        </Accordion>
      )}
    </Fieldset>
  );
}

function IntegrationEditor<Kind extends string, Secret extends string, Locale extends string>({
  draft,
  source,
  client,
  update,
  onAuthorityFailure,
}: {
  draft: EditableIntegration<Kind, Secret>;
  source: OnboardingSource<Kind, Secret, Locale>;
  client: OnboardingClient<Kind, Secret> | null;
  update(patch: Partial<EditableIntegration<Kind, Secret>>): void;
  onAuthorityFailure?(): void;
}) {
  const t = source.t;
  const [test, setTest] = useState<"idle" | "pending" | "passed" | "failed">("idle");
  const [validationError, setValidationError] = useState(false);
  const generation = useRef(0);
  const testing = useRef(false);
  const connectionRequest = useRef<AbortController | null>(null);
  const options = source.getAllSecretKindOptions(draft.kind);
  const apiKeyUrl = source.getIntegrationApiKeyUrl(draft.url, draft.kind);
  const documentationUrl = source.getIntegrationDocumentationUrl(draft.kind);
  const FloatingControl = source.OnboardingFloatingControl;
  const IntegrationAvatar = source.IntegrationAvatar;
  const complete = draft.url.trim().length > 0 && draft.secrets.every((secret) => secret.value.trim().length > 0);
  const lastTestInput = useRef<EditableIntegration<Kind, Secret> | null>(null);
  const lastInput = lastTestInput.current;
  const displayedTest =
    lastInput &&
    lastInput.name === draft.name &&
    lastInput.url === draft.url &&
    lastInput.kind === draft.kind &&
    lastInput.secrets === draft.secrets
      ? test
      : "idle";

  useEffect(
    () => () => {
      generation.current += 1;
      connectionRequest.current?.abort();
    },
    [],
  );

  const edit = (patch: Partial<EditableIntegration<Kind, Secret>>) => {
    generation.current += 1;
    setTest("idle");
    setValidationError(false);
    update(patch);
  };

  const testConnection = async () => {
    if (!client || testing.current || !complete) return;
    const parsed = source.onboardingIntegrationDraftSchema.safeParse({
      sourceId: draft.sourceId,
      name: draft.name,
      url: source.normalizeServiceUrl(draft.url) ?? draft.url,
      kind: draft.kind,
      secrets: draft.secrets,
    });
    if (!parsed.success) {
      setValidationError(true);
      return;
    }
    testing.current = true;
    const attempt = ++generation.current;
    lastTestInput.current = draft;
    const controller = new AbortController();
    connectionRequest.current = controller;
    setTest("pending");
    try {
      const result = await client.onboard.testIntegration(parsed.data, { signal: controller.signal });
      if (generation.current === attempt) setTest(result.success ? "passed" : "failed");
    } catch (error) {
      if (generation.current === attempt) setTest("failed");
      if (!controller.signal.aborted && isOnboardingAuthorityError(error)) onAuthorityFailure?.();
    } finally {
      testing.current = false;
    }
  };

  const status = !complete
    ? "needsConfiguration"
    : displayedTest === "passed"
      ? "tested"
      : displayedTest === "failed"
        ? "testFailed"
        : "testConnection";
  let color = "gray";
  let StatusIcon = IconPlugConnected;
  if (!complete) {
    color = "orange";
    StatusIcon = IconAlertCircle;
  } else if (displayedTest === "passed") {
    color = "green";
    StatusIcon = IconCheck;
  } else if (displayedTest === "failed") {
    color = "red";
    StatusIcon = IconX;
  }
  return (
    <Accordion.Item value={draft.sourceId}>
      <Accordion.Control
        icon={<IntegrationAvatar kind={draft.kind} size="sm" />}
        aria-label={`${draft.name}: ${t(`init.studio.connect.${status}`)}`}
      >
        <Group justify="space-between" wrap="nowrap" pr="sm">
          <Stack gap={0} miw={0}>
            <Text fw={650} truncate>
              {draft.name}
            </Text>
            <Text size="xs" c="dimmed">
              {source.getIntegrationName(draft.kind)} ·{" "}
              {t(`init.studio.connect.${draft.source === "docker" ? "dockerSource" : "manualSource"}`)}
            </Text>
          </Stack>
          <ThemeIcon
            className={source.presentation.classes.integrationStatus}
            color={color}
            variant="light"
            size="sm"
            radius="xl"
            aria-label={t(`init.studio.connect.${status}`)}
          >
            <StatusIcon size={14} />
          </ThemeIcon>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Stack>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label={t("common.field.name")}
              value={draft.name}
              onChange={(event) => edit({ name: event.currentTarget.value })}
              disabled={test === "pending"}
            />
            <TextInput
              label={t("init.studio.connect.url")}
              value={draft.url}
              onChange={(event) => edit({ url: event.currentTarget.value, urlOverridden: true })}
              disabled={test === "pending"}
              required
            />
          </SimpleGrid>
          {options.length > 1 ? (
            <FloatingControl
              ariaLabel={t("init.studio.connect.credentialMethod")}
              value={String(draft.secretOption)}
              options={options.map((kinds, index) => ({
                value: String(index),
                label:
                  kinds.length === 0 ? t("init.studio.connect.noCredentials") : kinds.map(formatSecretKind).join(" + "),
              }))}
              onChange={(value) => {
                const selected = options[Number(value)];
                if (test === "pending" || !selected) return;
                edit({
                  secretOption: Number(value),
                  secrets: selected.map((kind) => ({
                    kind,
                    value: draft.secrets.find((secret) => secret.kind === kind)?.value ?? "",
                  })),
                });
              }}
            />
          ) : null}
          {draft.secrets.map((secret, index) => (
            <PasswordInput
              key={secret.kind}
              label={formatSecretKind(secret.kind)}
              value={secret.value}
              autoComplete="off"
              disabled={test === "pending"}
              visibilityToggleFocusable
              visibilityToggleButtonProps={{ "aria-label": secret.kind }}
              onChange={(event) =>
                edit({
                  secrets: draft.secrets.map((entry, position) =>
                    position === index ? { ...entry, value: event.currentTarget.value } : entry,
                  ),
                })
              }
            />
          ))}
          {draft.secrets.length === 0 ? (
            <Text size="sm">{t("init.studio.connect.noCredentialsDescription")}</Text>
          ) : null}
          {validationError || displayedTest === "failed" ? (
            <Alert color="red" role="alert">
              {t("init.studio.connect.testErrorDescription")}
            </Alert>
          ) : null}
          {displayedTest === "passed" ? (
            <output>
              <Alert color="green">{t("init.studio.connect.testSuccessDescription")}</Alert>
            </output>
          ) : null}
          {apiKeyUrl ? (
            <Anchor href={apiKeyUrl} target="_blank" rel="noopener noreferrer" size="sm">
              <Group gap={4}>
                <IconKey size={14} />
                {t("init.studio.connect.getApiKey")}
                <IconExternalLink size={14} />
              </Group>
            </Anchor>
          ) : null}
          {!client ? (
            <Alert color="yellow" role="alert" id={`integration-test-hold-${draft.sourceId}`}>
              {source.holds.integrationTest}
            </Alert>
          ) : null}
          <Group justify="space-between" align="center" wrap="wrap">
            {documentationUrl ? (
              <Anchor href={documentationUrl} target="_blank" rel="noopener noreferrer" size="sm">
                <Group gap={4}>
                  <IconExternalLink size={14} />
                  {t("init.studio.connect.openGuide")}
                </Group>
              </Anchor>
            ) : (
              <span />
            )}
            <Button
              variant="default"
              size="xs"
              color={displayedTest === "passed" || displayedTest === "failed" ? color : undefined}
              leftSection={<StatusIcon size={14} />}
              disabled={!client || !complete}
              aria-describedby={!client ? `integration-test-hold-${draft.sourceId}` : undefined}
              loading={test === "pending"}
              onClick={() => void testConnection()}
            >
              {t("init.studio.connect.testConnection")}
            </Button>
          </Group>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function formatSecretKind(kind: string) {
  return kind.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());
}
