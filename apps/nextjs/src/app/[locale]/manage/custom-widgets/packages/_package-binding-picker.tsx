"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Alert, MultiSelect, Select, Stack } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { getWidgetConnectionBindingNames, isWidgetConnectionCompatible } from "@homarr/custom-widgets/package";
import type { CustomWidgetPackage } from "@homarr/custom-widgets/package";
import { useI18n } from "@homarr/translation/client";

export function PackageBindingPicker({
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
  const ids = [...new Set(getWidgetConnectionBindingNames(name, requirement, bindings).map((key) => bindings[key]!))];
  const compatible = connections.filter((connection) => isWidgetConnectionCompatible(requirement, connection.configuration));
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
      choices.push({ value: id, label: connections.find((connection) => connection.id === id)?.name ?? t("unavailableConnection") });
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
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
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
