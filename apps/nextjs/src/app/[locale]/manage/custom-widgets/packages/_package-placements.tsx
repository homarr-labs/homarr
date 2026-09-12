"use client";
import { useState } from "react";
import { Accordion, Alert, Button, Group, Paper, Select, Stack, Text, Textarea } from "@mantine/core";
import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { getCustomWidgetDefaultOptions, validateCustomWidgetOptions } from "@homarr/custom-widgets/core";
import type { CustomWidgetPackage } from "@homarr/custom-widgets/package";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { PackageOptionFields } from "@homarr/widgets/custom-api/package-option-fields";
import { PackageCollectors } from "./_package-collectors";
import { PackageWebhooks } from "./_package-webhooks";

type Installation = RouterOutputs["customWidget"]["package"]["get"];
export function AddPackagePlacement({
  installation,
  initialBoardId,
  source,
  initialOptions,
  onAdded,
  onError,
  onMessage,
}: {
  installation: Installation;
  initialBoardId?: string;
  source: CustomWidgetPackage;
  initialOptions?: Record<string, unknown>;
  onAdded(): void;
  onError(error: string): void;
  onMessage(message: string): void;
}) {
  const t = useI18n("customWidget.package");
  const boards = clientApi.board.getAllBoards.useQuery();
  const add = clientApi.board.addItem.useMutation();
  const [boardId, setBoardId] = useState<string | null>(initialBoardId ?? null);
  const [configuration, setConfiguration] = useState<Record<string, unknown>>(initialOptions ?? {});
  const values = { ...getCustomWidgetDefaultOptions(source.options), ...configuration };
  const missingConnections = Object.entries(source.connections).filter(
    ([name, requirement]) => !requirement.optional && !installation.bindings[name],
  );
  const issues = validateCustomWidgetOptions(source.options, values);
  return (
    <Paper withBorder p="md">
      <Stack>
        <Text fw={600}>{t("addToBoard")}</Text>
        <Text size="sm" c="dimmed">
          {t("placementDescription")}
        </Text>
        <Select
          searchable
          label={t("board")}
          value={boardId}
          onChange={setBoardId}
          data={(boards.data ?? []).map((board) => ({ value: board.id, label: board.name }))}
        />
        <PackageOptionFields schema={source.options} value={values} onChange={setConfiguration} />
        {missingConnections.length > 0 && (
          <Alert color="yellow">
            {t("bindFirst", { names: missingConnections.map(([, requirement]) => requirement.label).join(", ") })}
          </Alert>
        )}
        {issues.length > 0 && <Alert color="yellow">{issues[0]?.message}</Alert>}
        <Button
          disabled={!boardId || missingConnections.length > 0 || issues.length > 0}
          loading={add.isPending}
          onClick={() => {
            if (!boardId) return;
            add.mutate(
              {
                boardId,
                kind: "customApi",
                options: {
                  definitionId: installation.id,
                  configuration: values,
                  configurationVersion: source.manifest.configurationVersion,
                  connectionBindings: {},
                  refreshInterval: 30,
                },
                integrationIds: [],
              },
              {
                onSuccess: () => {
                  onAdded();
                  onMessage(t("addedToBoard"));
                },
                onError: (error) => onError(error.message),
              },
            );
          }}
        >
          {t("addToBoard")}
        </Button>
      </Stack>
    </Paper>
  );
}

export function PackagePlacements({
  installation,
  source,
}: {
  installation: Installation;
  source: CustomWidgetPackage;
}) {
  const t = useI18n("customWidget.package");
  const boards = clientApi.board.getAllBoards.useQuery();
  const actions = Object.entries(source.manifest.handlers).filter(
    ([, handler]) => handler.kind === "action" && handler.guestAccess,
  );
  return (
    <Stack gap="xs">
      <Text fw={600}>{t("placements", { count: installation.placements.length })}</Text>
      {installation.placements.map((placement) => {
        const board = boards.data?.find((entry) => entry.id === placement.boardId);
        return (
          <Paper key={placement.id} withBorder p="sm">
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm">{board?.name ?? placement.boardId}</Text>
                <Text size="xs" c="dimmed">
                  {placement.id}
                </Text>
                {board && (
                  <Button
                    component={Link}
                    href={`/boards/${encodeURIComponent(board.name)}`}
                    size="compact-xs"
                    variant="subtle"
                  >
                    {t("openBoard")}
                  </Button>
                )}
              </Group>
              <Accordion>
                <Accordion.Item value="webhooks">
                  <Accordion.Control>{t("webhook.title")}</Accordion.Control>
                  <Accordion.Panel>
                    <PackageWebhooks
                      itemId={placement.id}
                      handlers={Object.entries(source.manifest.handlers)
                        .filter(([, handler]) => handler.kind === "action" && handler.inputSchema)
                        .map(([name]) => name)}
                    />
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="collection">
                  <Accordion.Control>{t("collection")}</Accordion.Control>
                  <Accordion.Panel>
                    <PackageCollectors
                      itemId={placement.id}
                      queries={Object.entries(source.manifest.handlers)
                        .filter(([, handler]) => handler.kind === "query")
                        .map(([name]) => name)}
                    />
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
              {actions.length > 0 && (
                <Accordion>
                  <Accordion.Item value="guests">
                    <Accordion.Control>{t("guestActions")}</Accordion.Control>
                    <Accordion.Panel>
                      <GuestActions
                        itemId={placement.id}
                        actions={actions.map(([name, handler]) => ({ name, description: handler.description }))}
                      />
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              )}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}

function GuestActions({ itemId, actions }: { itemId: string; actions: Array<{ name: string; description?: string }> }) {
  const t = useI18n("customWidget.package");
  const grants = clientApi.customWidget.package.guestGrants.useQuery({ itemId });
  const mutation = clientApi.customWidget.package.setGuestGrant.useMutation();
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  return (
    <Stack>
      <Text size="sm">{t("guestDescription")}</Text>
      {actions.map(({ name, description }) => {
        const grant = grants.data?.find((entry) => entry.handler === name);
        const enabled = Boolean(grant?.current);
        return (
          <Stack key={name} gap="xs">
            <Text fw={500}>{name}</Text>
            {description && <Text size="xs">{description}</Text>}
            <Textarea
              label={t("allowedInputs")}
              value={inputs[name] ?? JSON.stringify(grant?.allowedInputs ?? [{}], null, 2)}
              onChange={(event) => setInputs({ ...inputs, [name]: event.currentTarget.value })}
            />
            <Button
              variant="light"
              loading={mutation.isPending}
              onClick={() => {
                const callbacks = {
                  onSuccess: () => void grants.refetch(),
                  onError: (cause: { message: string }) => setError(cause.message),
                };
                if (enabled) {
                  mutation.mutate({ itemId, handler: name, enabled: false }, callbacks);
                  return;
                }
                try {
                  const allowed: unknown = JSON.parse(inputs[name] ?? JSON.stringify(grant?.allowedInputs ?? [{}]));
                  if (!Array.isArray(allowed)) throw new Error(t("inputsArray"));
                  mutation.mutate({ itemId, handler: name, enabled: true, allowedInputs: allowed }, callbacks);
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : String(cause));
                }
              }}
            >
              {enabled ? t("disableGuest") : t("enableGuest")}
            </Button>
          </Stack>
        );
      })}
      {error && <Alert color="red">{error}</Alert>}
    </Stack>
  );
}
