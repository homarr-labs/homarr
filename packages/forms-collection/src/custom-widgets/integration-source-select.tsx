"use client";

import { Alert, Group, Select, Stack, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import { CustomWidgetSourceSetupPanel } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetSourceSetupPanelProps } from "@homarr/custom-widgets/workbench";

import { clientApi } from "@homarr/api/client";
import type { CustomWidgetIntegrationSource } from "@homarr/custom-widgets/core";
import { httpIntegrationKinds, integrationDefs, isHttpIntegrationKind } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { IntegrationAvatar, SelectWithCustomItems } from "@homarr/ui";

const integrationTypeOptions = httpIntegrationKinds
  .map((value) => ({ value, label: integrationDefs[value].name }))
  .toSorted((left, right) => left.label.localeCompare(right.label));

function IntegrationTypeOption({ value, label, checked }: { value: string; label: string; checked?: boolean }) {
  return (
    <Group flex="1" gap="xs" wrap="nowrap">
      {isHttpIntegrationKind(value) && <IntegrationAvatar kind={value} size="xs" />}
      <Text size="sm">{label}</Text>
      {checked && <IconCheck size={16} style={{ marginInlineStart: "auto", flexShrink: 0 }} />}
    </Group>
  );
}

interface IntegrationSourceSelectProps {
  kind: CustomWidgetIntegrationSource["integrationKind"];
  integrationId?: string;
  onChange(integrationId: string | undefined): void;
  onKindChange?(kind: CustomWidgetIntegrationSource["integrationKind"]): void;
}

export function IntegrationSourceSelect({ kind, integrationId, onChange, onKindChange }: IntegrationSourceSelectProps) {
  const t = useI18n("customWidget.workbench.sources");
  const tIntegration = useI18n("integration");
  const tCommon = useI18n("common");
  const query = clientApi.integration.all.useQuery();
  const integrations = (query.data ?? []).filter(
    (integration) => integration.kind === kind && integration.permissions.hasFullAccess,
  );
  const unavailable = Boolean(integrationId && query.isSuccess && !integrations.some(({ id }) => id === integrationId));
  return (
    <Stack gap="sm">
      {onKindChange && (
        <SelectWithCustomItems
          label={t("integrationType")}
          searchable
          searchPlaceholder={tIntegration("page.list.search")}
          nothingFoundMessage={tCommon("noResults")}
          data={integrationTypeOptions}
          value={kind}
          SelectOption={IntegrationTypeOption}
          withinPortal
          onChange={(value) => {
            const selected = httpIntegrationKinds.find((candidate) => candidate === value);
            if (selected && selected !== kind) onKindChange(selected);
          }}
        />
      )}
      <Select
        label={t("selectIntegration")}
        description={isHttpIntegrationKind(kind) ? integrationDefs[kind].name : kind}
        data={integrations.map(({ id, name }) => ({ value: id, label: name }))}
        value={integrationId ?? null}
        searchable
        clearable
        loading={query.isPending}
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

export function SourceSetupPanel(props: CustomWidgetSourceSetupPanelProps) {
  return (
    <CustomWidgetSourceSetupPanel
      {...props}
      renderIntegrationSource={(setup, value) => {
        const kind = httpIntegrationKinds.find((candidate) => candidate === setup.integrationKind);
        if (!kind) return null;
        return (
          <IntegrationSourceSelect
            kind={kind}
            integrationId={value.integrationId}
            onChange={(integrationId) => props.onChange(setup.sourceId, { ...value, integrationId })}
          />
        );
      }}
    />
  );
}
