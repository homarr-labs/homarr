"use client";

import { ConnectionEditor } from "./_package-connection-editor";
import { PackageConnectionDiagnostic } from "./_package-connection-diagnostic";
import type { RouterOutputs } from "@homarr/api";
import { useState } from "react";
import { Alert, Button, Group, Paper, Select, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { isRecord } from "@homarr/common";
import { isWidgetConnectionCompatible } from "@homarr/custom-widgets/package";
import type { CustomWidgetPackage } from "@homarr/custom-widgets/package";
import { useI18n } from "@homarr/translation/client";

export function PackageConnections({
  requirements,
  bindings,
  onChange,
  onSave,
  saving,
  onConnectionSaved,
}: {
  requirements: CustomWidgetPackage["connections"];
  bindings: Record<string, string>;
  onChange(bindings: Record<string, string>): void;
  onSave?(): void;
  saving: boolean;
  onConnectionSaved?(): void;
}) {
  const t = useI18n("customWidget.package");
  const utils = clientApi.useUtils();
  const connections = clientApi.customWidget.package.connections.useQuery();
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
          <Group align="end">
            <Select
              flex={1}
              label={requirement.label}
              description={requirement.description}
              required={!requirement.optional}
              clearable
              searchable
              value={bindings[name] ?? null}
              data={(connections.data ?? [])
                .filter(
                  (connection) =>
                    isRecord(connection.configuration) &&
                    isWidgetConnectionCompatible(requirement, connection.configuration),
                )
                .map((connection) => ({ value: connection.id, label: connection.name }))}
              onChange={(value) => {
                const next = { ...bindings };
                delete next[name];
                if (value) next[name] = value;
                onChange(next);
              }}
            />
            <Button
              variant="default"
              disabled={!bindings[name]}
              loading={diagnose.isPending}
              onClick={() => {
                const id = bindings[name];
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
              disabled={!bindings[name]}
              onClick={() => {
                setCreating(false);
                setEditingId(bindings[name] ?? null);
              }}
            >
              {t("editConnection")}
            </Button>
          </Group>
        </Paper>
      ))}
      {diagnostic && <PackageConnectionDiagnostic result={diagnostic} />}
      {diagnosticError && <Alert color="red">{diagnosticError}</Alert>}
      <Group>
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
