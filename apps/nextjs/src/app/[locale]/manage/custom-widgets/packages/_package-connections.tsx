"use client";

import { ConnectionEditor } from "./_package-connection-editor";
import { PackageConnectionDiagnostic } from "./_package-connection-diagnostic";
import { PackageBindingPicker } from "./_package-binding-picker";
import type { RouterOutputs } from "@homarr/api";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Alert, Button, Group, Paper, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { getWidgetConnectionBindingNames } from "@homarr/custom-widgets/package";
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
                <Text size="sm" flex={1}>{connections.data?.find((entry) => entry.id === bindings[bindingName])?.name ?? bindingName}</Text>
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
          <Button component={Link} href="/manage/integrations/new" target="_blank" rel="noopener noreferrer" variant="light">
            {t("createIntegration")}
          </Button>
        )}
        <Button variant="subtle" onClick={() => { void connections.refetch(); void integrations.refetch(); }}>
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
