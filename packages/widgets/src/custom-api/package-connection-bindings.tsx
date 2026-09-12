"use client";

import { Alert, Select, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { isRecord } from "@homarr/common";
import { isWidgetConnectionCompatible } from "@homarr/custom-widgets/package";
import type { CustomWidgetPackage } from "@homarr/custom-widgets/package";
import { useI18n } from "@homarr/translation/client";

export function PackageConnectionBindings({
  connections,
  installationBindings,
  value,
  onChange,
}: {
  connections: CustomWidgetPackage["connections"];
  installationBindings: Record<string, string>;
  value: Record<string, string>;
  onChange(value: Record<string, string>): void;
}) {
  const t = useI18n("widget.customApi.configuration");
  const { data: session } = useSession();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;
  const local = clientApi.customWidget.package.connections.useQuery(undefined, {
    enabled: isAdmin && Object.keys(connections).length > 0,
  });
  if (!isAdmin) return null;
  return (
    <Stack gap="sm">
      {local.isError && <Alert color="red">{t("connectionsError")}</Alert>}
      {Object.entries(connections).map(([name, connection]) => {
        const candidates = (local.data ?? []).filter(
          (row) => isRecord(row.configuration) && isWidgetConnectionCompatible(connection, row.configuration),
        );
        const defaults = candidates.find((row) => row.id === installationBindings[name]);
        const selected = value[name];
        const choices = candidates.map((row) => ({ value: row.id, label: row.name }));
        if (selected && !candidates.some((row) => row.id === selected))
          choices.push({ value: selected, label: t("connectionUnavailable") });
        let placeholder = t("connectionUnbound");
        if (defaults) placeholder = t("connectionDefault", { name: defaults.name });
        let error: string | undefined;
        if (local.data && !connection.optional && !selected && !defaults) error = t("connectionMissing");
        if (local.data && selected && !candidates.some((row) => row.id === selected))
          error = t("connectionUnavailable");
        return (
          <Select
            key={name}
            label={connection.label}
            description={connection.description}
            required={!connection.optional}
            placeholder={placeholder}
            clearable
            searchable
            data={choices}
            value={selected ?? null}
            error={error}
            disabled={local.isLoading}
            onChange={(next) => {
              const bindings = { ...value };
              if (next) bindings[name] = next;
              else delete bindings[name];
              onChange(bindings);
            }}
          />
        );
      })}
    </Stack>
  );
}
