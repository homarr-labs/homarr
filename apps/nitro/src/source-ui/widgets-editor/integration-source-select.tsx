import { Alert, Avatar, Group, Select, Stack, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { CustomWidgetIntegrationSource } from "@homarr/custom-widgets/core";
import { getIconUrl, httpIntegrationKinds, integrationDefs, isHttpIntegrationKind } from "@homarr/definitions";
import { useI18n, useWorkbenchBindings } from "./workbench-context";

const integrationTypeOptions = httpIntegrationKinds
  .map((value) => ({ value, label: integrationDefs[value].name }))
  .toSorted((left, right) => left.label.localeCompare(right.label));

export function IntegrationSourceSelect({
  kind,
  integrationId,
  onChange,
  onKindChange,
}: {
  kind: CustomWidgetIntegrationSource["integrationKind"];
  integrationId?: string;
  onChange(integrationId: string | undefined): void;
  onKindChange?(kind: CustomWidgetIntegrationSource["integrationKind"]): void;
}) {
  const t = useI18n("customWidget.workbench.sources");
  const tCommon = useI18n("common");
  const bindings = useWorkbenchBindings();
  const integrations = bindings.integrations.filter(
    (integration) => integration.kind === kind && integration.permissions?.hasFullAccess === true,
  );
  const unavailable = Boolean(
    integrationId && !bindings.integrationsPending && !integrations.some(({ id }) => id === integrationId),
  );
  return (
    <Stack gap="sm">
      {onKindChange && (
        <Select
          label={t("integrationType")}
          searchable
          nothingFoundMessage={tCommon("noResults")}
          data={integrationTypeOptions}
          value={kind}
          renderOption={({ option, checked }) => (
            <Group flex="1" gap="xs" wrap="nowrap">
              {isHttpIntegrationKind(option.value) && <Avatar src={getIconUrl(option.value)} size="xs" />}
              <Text size="sm">{option.label}</Text>
              {checked && <IconCheck size={16} style={{ marginInlineStart: "auto", flexShrink: 0 }} />}
            </Group>
          )}
          onChange={(value) => {
            const selected = httpIntegrationKinds.find((candidate) => candidate === value);
            if (selected && selected !== kind) onKindChange(selected);
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
        disabled={bindings.integrationsPending}
        rightSection={bindings.integrationsPending ? "…" : undefined}
        nothingFoundMessage={t("noIntegrations")}
        error={unavailable && t("integrationUnavailable")}
        onChange={(value) => onChange(value ?? undefined)}
      />
      {bindings.integrationsError && <Alert color="red">{bindings.integrationsError}</Alert>}
      <Text size="xs" c="dimmed">
        {t("integrationDescription")}
      </Text>
    </Stack>
  );
}
