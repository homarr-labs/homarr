"use client";

import { Alert, Select, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { CustomWidgetIntegrationSource } from "@homarr/custom-widgets/core";
import { customWidgetIntegrationKinds } from "@homarr/custom-widgets/core";
import { integrationDefs } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

interface IntegrationSourceSelectProps {
  kind: CustomWidgetIntegrationSource["integrationKind"];
  integrationId?: string;
  onChange(integrationId: string | undefined): void;
  onKindChange?(kind: CustomWidgetIntegrationSource["integrationKind"]): void;
}

export function IntegrationSourceSelect({ kind, integrationId, onChange, onKindChange }: IntegrationSourceSelectProps) {
  const t = useI18n("customWidget.workbench.sources");
  const query = clientApi.integration.all.useQuery();
  const integrations = (query.data ?? []).filter(
    (integration) => integration.kind === kind && integration.permissions.hasFullAccess,
  );
  const unavailable = Boolean(integrationId && query.isSuccess && !integrations.some(({ id }) => id === integrationId));
  return (
    <Stack gap="sm">
      {onKindChange && (
        <Select
          label={t("integrationType")}
          data={customWidgetIntegrationKinds.map((value) => ({ value, label: integrationDefs[value].name }))}
          value={kind}
          allowDeselect={false}
          onChange={(value) => {
            const selected = customWidgetIntegrationKinds.find((candidate) => candidate === value);
            if (selected) onKindChange(selected);
          }}
        />
      )}
      <Select
        label={t("selectIntegration")}
        description={integrationDefs[kind].name}
        data={integrations.map(({ id, name }) => ({ value: id, label: name }))}
        value={integrationId ?? null}
        searchable
        clearable
        disabled={query.isPending}
        nothingFoundMessage={t("noIntegrations")}
        error={unavailable && t("integrationUnavailable")}
        onChange={(value) => onChange(value ?? undefined)}
      />
      {query.error && <Alert color="red">{query.error.message}</Alert>}
      <Text size="xs" c="dimmed">
        {t("integrationDescription")}
      </Text>
    </Stack>
  );
}
