"use client";

import { extractErrorMessage } from "@homarr/common";

import { ConnectionEditor } from "./_package-connection-editor";
import type { RouterOutputs } from "@homarr/api";
import { useState, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Alert, Button, Group, Paper, Stack, Text, MultiSelect, Select, Accordion, Badge } from "@mantine/core";
import { clientApi } from "@homarr/api/client";
import { getWidgetConnectionBindingNames, isWidgetConnectionCompatible } from "@homarr/custom-widgets/package";
import type { CustomWidgetPackage } from "@homarr/custom-widgets/package";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

export function PackageConnections({
  requirements,
  bindings,
  onChange,
  onPendingChange,
  onSave,
  saving,
  onConnectionSaved,
}: {
  requirements: CustomWidgetPackage["connections"];
  bindings: Record<string, string>;
  onChange: Dispatch<SetStateAction<Record<string, string>>>;
  onPendingChange(pending: boolean): void;
  onSave?(): void;
  saving: boolean;
  onConnectionSaved?(): void;
}) {
  const t = useI18n("customWidget.package");
  const utils = clientApi.useUtils();
  const connections = clientApi.customWidget.package.connections.useQuery();
  const integrations = clientApi.integration.all.useQuery();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<RouterOutputs["customWidget"]["package"]["diagnoseConnection"] | null>(
    null,
  );
  const [diagnosticError, setDiagnosticError] = useState("");
  const diagnose = clientApi.customWidget.package.diagnoseConnection.useMutation();
  return (
    <Stack>
      <Text size="sm" c="dimmed">
        {t("connectionsDescription")}
      </Text>
      {Object.keys(requirements).length === 0 && <Alert>{t("noConnections")}</Alert>}
      {Object.entries(requirements).map(([name, requirement]) => (
        <Paper key={name} withBorder p="sm">
          <Stack gap="xs">
            <PackageBindingPicker
              name={name}
              requirement={requirement}
              connections={connections.data ?? []}
              integrations={integrations.data ?? []}
              bindings={bindings}
              onChange={onChange}
              onPendingChange={onPendingChange}
              disabled={saving}
            />
            {getWidgetConnectionBindingNames(name, requirement, bindings).map((bindingName) => (
              <Group key={bindingName} gap="xs">
                <Text size="sm" flex={1}>
                  {connections.data?.find((entry) => entry.id === bindings[bindingName])?.name ?? bindingName}
                </Text>
                <Button
                  variant="default"
                  size="xs"
                  loading={diagnose.isPending}
                  onClick={() => {
                    const id = bindings[bindingName];
                    if (!id) return;
                    setDiagnostic(null);
                    setDiagnosticError("");
                    diagnose.mutate(
                      { id },
                      {
                        onSuccess: setDiagnostic,
                        onError: (error) => setDiagnosticError(error.message),
                      },
                    );
                  }}
                >
                  {t("diagnose")}
                </Button>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setCreating(false);
                    setEditingId(bindings[bindingName] ?? null);
                  }}
                >
                  {t("editConnection")}
                </Button>
              </Group>
            ))}
          </Stack>
        </Paper>
      ))}
      {diagnostic && <PackageConnectionDiagnostic result={diagnostic} />}
      {diagnosticError && <Alert color="red">{diagnosticError}</Alert>}
      {connections.error && <Alert color="red">{connections.error.message}</Alert>}
      {integrations.error && <Alert color="red">{integrations.error.message}</Alert>}
      <Group>
        {Object.values(requirements).some((requirement) => requirement.kind === "integration") && (
          <Button
            component={Link}
            href="/manage/integrations/new"
            target="_blank"
            rel="noopener noreferrer"
            variant="light"
          >
            {t("createIntegration")}
          </Button>
        )}
        <Button
          variant="subtle"
          onClick={() => {
            void connections.refetch();
            void integrations.refetch();
          }}
        >
          {t("refresh")}
        </Button>
        <Button
          variant="default"
          onClick={() => {
            setEditingId(null);
            setCreating(!creating);
          }}
        >
          {t("newConnection")}
        </Button>
        {onSave && (
          <Button loading={saving} onClick={onSave}>
            {t("saveBindings")}
          </Button>
        )}
      </Group>
      {(creating || editingId) && (
        <ConnectionEditor
          key={editingId ?? "new"}
          connection={connections.data?.find((entry) => entry.id === editingId)}
          onSaved={() => {
            setCreating(false);
            setEditingId(null);
            void connections.refetch();
            void utils.customWidget.package.guestGrants.invalidate();
            void utils.customWidget.package.webhooks.invalidate();
            onConnectionSaved?.();
          }}
        />
      )}
    </Stack>
  );
}

function PackageBindingPicker({
  name,
  requirement,
  connections,
  integrations,
  bindings,
  onChange,
  onPendingChange,
  disabled,
}: {
  name: string;
  requirement: CustomWidgetPackage["connections"][string];
  connections: RouterOutputs["customWidget"]["package"]["connections"];
  integrations: RouterOutputs["integration"]["all"];
  bindings: Record<string, string>;
  onChange: Dispatch<SetStateAction<Record<string, string>>>;
  onPendingChange(pending: boolean): void;
  disabled: boolean;
}) {
  const t = useI18n("customWidget.package");
  const utils = clientApi.useUtils();
  const saveConnection = clientApi.customWidget.package.saveConnection.useMutation();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const preparing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const ids = [
    ...new Set(
      getWidgetConnectionBindingNames(name, requirement, bindings)
        .map((key) => bindings[key])
        .filter((id) => typeof id === "string"),
    ),
  ];
  const compatible = connections.filter((connection) =>
    isWidgetConnectionCompatible(requirement, connection.configuration),
  );
  const choices = compatible.map((connection) => ({ value: connection.id, label: connection.name }));
  if (requirement.kind === "integration") {
    for (const integration of integrations) {
      if (requirement.integrationKind && integration.kind !== requirement.integrationKind) continue;
      if (compatible.some((connection) => connection.integrationId === integration.id)) continue;
      choices.push({ value: `integration:${integration.id}`, label: integration.name });
    }
  }
  // Keep unavailable bindings visible so a removed integration can be diagnosed or replaced.
  for (const id of ids) {
    if (!choices.some((choice) => choice.value === id))
      choices.push({
        value: id,
        label: connections.find((connection) => connection.id === id)?.name ?? t("unavailableConnection"),
      });
  }
  const change = async (values: string[]) => {
    if (preparing.current || disabled) return;
    preparing.current = true;
    setPending(true);
    onPendingChange(true);
    setError("");
    try {
      const nextIds: string[] = [];
      for (const value of values) {
        if (!value.startsWith("integration:")) {
          nextIds.push(value);
          continue;
        }
        const integration = integrations.find((entry) => `integration:${entry.id}` === value);
        if (!integration) throw new Error(t("unavailableConnection"));
        const result = await saveConnection.mutateAsync({
          name: integration.name,
          integrationId: integration.id,
          configuration: { kind: "integration" },
        });
        nextIds.push(result.id);
      }
      if (!mounted.current) return;
      onChange((current) => {
        const next = { ...current };
        for (const key of getWidgetConnectionBindingNames(name, requirement, next)) delete next[key];
        for (const [index, id] of nextIds.entries()) {
          let key = name;
          if (index > 0) key = `${name}:${id}`;
          next[key] = id;
        }
        return next;
      });
    } catch (cause) {
      if (mounted.current) setError(extractErrorMessage(cause));
    } finally {
      // Refresh the list independently; a failed refetch must not discard a selection.
      if (values.some((value) => value.startsWith("integration:")))
        void utils.customWidget.package.connections.invalidate();
      preparing.current = false;
      if (mounted.current) setPending(false);
      onPendingChange(false);
    }
  };
  const common = {
    label: requirement.label,
    description: requirement.description,
    placeholder: t("chooseConnection"),
    required: !requirement.optional,
    searchable: true,
    clearable: true,
    disabled: pending || disabled,
    data: choices,
    nothingFoundMessage: t("noCompatibleConnections"),
  };
  return (
    <Stack gap="xs" flex={1}>
      {requirement.multiple ? (
        <MultiSelect {...common} value={ids} onChange={(values) => void change(values)} />
      ) : (
        <Select {...common} value={ids[0] ?? null} onChange={(value) => void change(value ? [value] : [])} />
      )}
      {error && <Alert color="red">{error}</Alert>}
    </Stack>
  );
}

type Diagnostic = RouterOutputs["customWidget"]["package"]["diagnoseConnection"];

function PackageConnectionDiagnostic({ result }: { result: Diagnostic }) {
  const t = useI18n("customWidget.package.diagnostic");
  let color = "yellow";
  if (["connected", "integration", "fileReadable", "transportReachable"].includes(result.status)) color = "green";
  if (["dnsError", "unavailable", "httpError", "serviceUnavailable"].includes(result.status)) color = "red";
  return (
    <Stack gap="xs">
      <Alert color={color} title={t(`status.${result.status}`)}>
        <Stack gap="xs">
          <Text size="sm">{t(`help.${result.status}`)}</Text>
          {"stage" in result && (
            <Text size="xs">
              {t("phase", { phase: t(`stage.${result.stage as "dns" | "connection" | "tls" | "response"}`) })}
            </Text>
          )}
          {"hostname" in result && (
            <Text size="sm" ff="monospace">
              {result.hostname}
            </Text>
          )}
          {result.addresses.length > 0 && (
            <Group gap="xs">
              {result.addresses.map(({ address }) => (
                <Badge key={address} variant="outline" tt="none">
                  {address}
                </Badge>
              ))}
            </Group>
          )}
          {"httpStatus" in result && typeof result.httpStatus === "number" && typeof result.durationMs === "number" && (
            <Text size="xs">{t("response", { status: result.httpStatus, milliseconds: result.durationMs })}</Text>
          )}
          {"sampleFields" in result && Array.isArray(result.sampleFields) && result.sampleFields.length > 0 && (
            <Text size="xs">{t("fields", { fields: result.sampleFields.join(", ") })}</Text>
          )}
        </Stack>
      </Alert>
      <Accordion>
        <Accordion.Item value="details">
          <Accordion.Control>{t("details")}</Accordion.Control>
          <Accordion.Panel>
            <Text component="pre" size="xs" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {JSON.stringify(result, null, 2)}
            </Text>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
