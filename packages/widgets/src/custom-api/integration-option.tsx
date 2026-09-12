"use client";

import { Select } from "@mantine/core";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

export function CustomWidgetIntegrationOption({
  value,
  onChange,
  label,
  description,
  kinds,
  error,
  disabled,
}: {
  value?: unknown;
  onChange(value: string): void;
  label: string;
  description?: string;
  kinds?: readonly string[];
  error?: React.ReactNode;
  disabled?: boolean;
}) {
  const t = useI18n("customWidget.flow");
  const integrations = clientApi.integration.all.useQuery();
  const data = (integrations.data ?? [])
    .filter(
      (integration) => integration.permissions.hasUseAccess && (!kinds?.length || kinds.includes(integration.kind)),
    )
    .map((integration) => ({ value: integration.id, label: `${integration.name} (${integration.kind})` }));
  return (
    <Select
      searchable
      clearable
      label={label}
      description={description}
      data={data}
      value={typeof value === "string" ? value : null}
      onChange={(next) => onChange(next ?? "")}
      placeholder={t("chooseIntegration")}
      nothingFoundMessage={t("noIntegrations")}
      disabled={disabled || integrations.isLoading}
      error={integrations.error?.message ?? error}
    />
  );
}
