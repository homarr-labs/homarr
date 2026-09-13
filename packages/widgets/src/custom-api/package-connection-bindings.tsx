"use client";

import { Alert, Button, MultiSelect, Select, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { isRecord } from "@homarr/common";
import {
  getWidgetConnectionBindingNames,
  isWidgetConnectionCompatible,
  mergeWidgetConnectionBindings,
} from "@homarr/custom-widgets/package";
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
  const effectiveBindings = mergeWidgetConnectionBindings(connections, installationBindings, value);
  return (
    <Stack gap="sm">
      {local.isError && <Alert color="red">{t("connectionsError")}</Alert>}
      {Object.entries(connections).map(([name, connection]) => {
        const candidates = (local.data ?? []).filter(
          (row) => isRecord(row.configuration) && isWidgetConnectionCompatible(connection, row.configuration),
        );
        if (connection.multiple) {
          const names = getWidgetConnectionBindingNames(name, connection, effectiveBindings);
          const selected = [
            ...new Set(names.map((key) => effectiveBindings[key]).filter((id) => typeof id === "string")),
          ];
          const choices = candidates.map((row) => ({ value: row.id, label: row.name }));
          for (const id of selected) {
            if (!choices.some((choice) => choice.value === id))
              choices.push({ value: id, label: t("connectionUnavailable") });
          }
          const overrideKeys = Object.keys(value).filter((key) => key === name || key.startsWith(`${name}:`));
          const withoutOverride = () => {
            const bindings = { ...value };
            for (const key of overrideKeys) delete bindings[key];
            return bindings;
          };
          let error: string | undefined;
          if (local.data && !connection.optional && !selected.length) error = t("connectionMissing");
          if (local.data && selected.some((id) => !candidates.some((row) => row.id === id)))
            error = t("connectionUnavailable");
          return (
            <Stack key={name} gap="xs">
              <MultiSelect
                label={connection.label}
                description={connection.description}
                required={!connection.optional}
                placeholder={t("connectionUnbound")}
                clearable
                searchable
                data={choices}
                value={selected}
                error={error}
                disabled={local.isLoading}
                onChange={(ids) => {
                  const bindings = withoutOverride();
                  bindings[name] = ids[0] ?? "";
                  for (const id of ids.slice(1)) bindings[`${name}:${id}`] = id;
                  onChange(bindings);
                }}
              />
              {overrideKeys.length > 0 && (
                <Button variant="subtle" size="compact-xs" onClick={() => onChange(withoutOverride())}>
                  {t("useInstallationConnections")}
                </Button>
              )}
            </Stack>
          );
        }
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
