"use client";

import { Alert, Select, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { getCustomWidgetIntegrationOptionIds } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { useI18n } from "@homarr/translation/client";

export function ImportIntegrationSetup({
  widget,
  values,
  onChange,
}: {
  widget: HomarrCustomWidgetV2 | null;
  values: Record<string, string>;
  onChange(id: string, value: string): void;
}) {
  const t = useI18n("customWidget.flow");
  const ids = widget ? [...getCustomWidgetIntegrationOptionIds(widget)] : [];
  const integrations = clientApi.integration.all.useQuery(undefined, { enabled: ids.length > 0 });
  if (!widget || ids.length === 0) return null;
  return (
    <Stack gap="sm">
      <Text fw={600}>{t("installIntegrations")}</Text>
      <Text size="sm" c="dimmed">
        {t("installIntegrationsHint")}
      </Text>
      {integrations.error && <Alert color="red">{integrations.error.message}</Alert>}
      {ids.map((id) => {
        const option = widget.options[id];
        if (!option) return null;
        const available = (integrations.data ?? []).filter(
          (integration) => !option.integrationKinds || option.integrationKinds.includes(integration.kind),
        );
        return (
          <Select
            key={id}
            label={option.label}
            searchable
            clearable
            value={values[id] ?? null}
            placeholder={t("configureIntegrationLater")}
            disabled={integrations.isPending}
            data={available.map((integration) => ({ value: integration.id, label: integration.name }))}
            onChange={(value) => onChange(id, value ?? "")}
          />
        );
      })}
    </Stack>
  );
}
