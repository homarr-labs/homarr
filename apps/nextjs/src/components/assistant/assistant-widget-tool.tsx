"use client";

import { useMemo } from "react";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { Alert, Box, Button, Group, Skeleton, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconSettings } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import type { IntegrationKind } from "@homarr/definitions";
import { useModalAction } from "@homarr/modals";
import type { SettingsContextProps } from "@homarr/settings/creator";
import { useSettings } from "@homarr/settings";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { reduceWidgetOptionsWithDefaultValues, widgetImports } from "@homarr/widgets";
import type { IntegrationSelectOption } from "@homarr/widgets/widget-integration-select";
import { WidgetEditModal } from "@homarr/widgets/modals";

import classes from "./assistant-panel.module.css";
import { useAssistantAutomaticAction } from "./assistant-auto-approval";
import { AssistantAutomaticActionProgress } from "./assistant-automatic-action-progress";
import { hasCompleteAssistantToolArguments, hasFailedAssistantToolArguments } from "./assistant-human-tool-status";
import type { ConfigureWidgetArgs, ConfigureWidgetResult } from "./assistant-tool-contracts";
import { IntegrationSelectModal } from "../integration/integration-select-modal";

interface AssistantIntegration extends IntegrationSelectOption {
  permissions: NonNullable<IntegrationSelectOption["permissions"]>;
}

export const getAssistantWidgetConfiguration = (
  args: ConfigureWidgetArgs,
  settings: Pick<SettingsContextProps, "enableStatusByDefault" | "forceDisableStatus">,
  integrations: AssistantIntegration[],
) => {
  const definition = widgetImports[args.kind].definition;
  const integrationSupport = "supportedIntegrations" in definition;
  const supportedIntegrations = integrationSupport
    ? (definition.supportedIntegrations as readonly IntegrationKind[])
    : [];
  const integrationData = integrations.filter(
    (integration) => integration.permissions.hasUseAccess && supportedIntegrations.includes(integration.kind),
  );
  const requestedIds = new Set(args.integrationIds ?? []);
  const selectedIntegrations =
    requestedIds.size > 0 ? integrationData.filter((integration) => requestedIds.has(integration.id)) : integrationData;
  const maxIntegrations = "maxIntegrations" in definition ? (definition.maxIntegrations ?? Infinity) : Infinity;
  const integrationIds = selectedIntegrations.slice(0, maxIntegrations).map((integration) => integration.id);

  return {
    integrationData,
    integrationSupport,
    integrationsRequired:
      integrationSupport && (!("integrationsRequired" in definition) || definition.integrationsRequired !== false),
    value: {
      advancedOptions: { title: null, customCssClasses: [], borderColor: "" },
      options: reduceWidgetOptionsWithDefaultValues(args.kind, settings, args.options),
      integrationIds,
    },
  };
};

export const AssistantConfigureWidgetTool = ({
  args,
  result,
  addResult,
  status,
  toolCallId,
}: ToolCallMessagePartProps<ConfigureWidgetArgs, ConfigureWidgetResult>) => {
  const t = useScopedI18n("common.assistant.configureWidget");
  const fullT = useI18n();
  const { data: session } = useSession();
  const settings = useSettings();
  const hasCompleteArguments = hasCompleteAssistantToolArguments(status);
  const definition = args?.kind ? widgetImports[args.kind].definition : undefined;
  const needsIntegrations = definition !== undefined && "supportedIntegrations" in definition;
  const integrations = clientApi.integration.all.useQuery(undefined, {
    enabled: result === undefined && hasCompleteArguments && needsIntegrations,
    retry: false,
  });
  const configuration = useMemo(() => {
    if (!args || !hasCompleteArguments || (needsIntegrations && !integrations.data)) return null;
    return getAssistantWidgetConfiguration(args, settings, integrations.data ?? []);
  }, [args, hasCompleteArguments, integrations.data, needsIntegrations, settings]);
  const missingRequiredIntegration =
    configuration?.integrationsRequired === true && configuration.value.integrationIds.length === 0;
  const { openModal: openWidgetModal } = useModalAction(WidgetEditModal);
  const { openModal: openIntegrationModal } = useModalAction(IntegrationSelectModal);
  const autoConfirming = useAssistantAutomaticAction({
    toolCallId,
    ready: result === undefined && configuration !== null && !missingRequiredIntegration,
    completed: result !== undefined,
    confirm: () => {
      if (!args || !configuration) return;
      if (missingRequiredIntegration) {
        addResult({ boardId: args.boardId, kind: args.kind, cancelled: true, reason: "no-compatible-integration" });
        return;
      }
      addResult({
        boardId: args.boardId,
        kind: args.kind,
        options: configuration.value.options,
        integrationIds: configuration.value.integrationIds,
      });
    },
  });

  if (result) {
    const cancelled = "cancelled" in result && result.cancelled;
    return (
      <Box className={classes.humanToolCompleted}>
        <ThemeIcon size="sm" radius="xl" variant="light" color={cancelled ? "orange" : "green"}>
          {cancelled ? <IconAlertTriangle size={13} /> : <IconCheck size={13} />}
        </ThemeIcon>
        <Box miw={0}>
          <Text size="xs" c="dimmed">
            {cancelled ? t("cancelled") : t("ready")}
          </Text>
          <Text size="sm" fw={600} truncate>
            {args?.kind ? fullT(`widget.${args.kind}.name`) : t("title")}
          </Text>
        </Box>
      </Box>
    );
  }

  if (hasFailedAssistantToolArguments(status)) {
    return (
      <Alert color="red" variant="light" title={t("errorTitle")} icon={<IconAlertTriangle size={18} />}>
        {t("errorDescription")}
      </Alert>
    );
  }

  if (!hasCompleteArguments || !args || (needsIntegrations && integrations.isPending)) {
    return (
      <Box className={classes.appTool} aria-label={t("preparing")}>
        <Stack gap="sm">
          <Skeleton height={18} width="45%" />
          <Skeleton height={14} width="76%" />
          <Skeleton height={38} />
        </Stack>
      </Box>
    );
  }

  if (integrations.isError) {
    return (
      <Alert color="red" variant="light" title={t("loadErrorTitle")} icon={<IconAlertTriangle size={18} />}>
        <Stack gap="sm">
          <Text size="sm">{t("loadErrorDescription")}</Text>
          <Button variant="light" color="red" size="compact-sm" w="fit-content" onClick={() => integrations.refetch()}>
            {t("retry")}
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (!configuration) return null;

  const openConfigurationModal = (
    value = configuration.value,
    integrationData: IntegrationSelectOption[] = configuration.integrationData,
  ) =>
    openWidgetModal(
      {
        kind: args.kind,
        definition: widgetImports[args.kind].definition,
        value,
        integrationData,
        integrationSupport: configuration.integrationSupport,
        settings,
        onSuccessfulEdit: ({ options, integrationIds }) =>
          addResult({ boardId: args.boardId, kind: args.kind, options, integrationIds }),
      },
      {
        title: (titleT) => `${titleT("item.edit.title")} - ${titleT(`widget.${args.kind}.name`)}`,
      },
    );

  if (autoConfirming) {
    return (
      <Box className={classes.appTool}>
        <AssistantAutomaticActionProgress label={t("automaticContinue")} />
      </Box>
    );
  }

  if (missingRequiredIntegration) {
    return (
      <Alert color="orange" variant="light" title={t("noIntegrationTitle")} icon={<IconAlertTriangle size={18} />}>
        <Stack gap="sm">
          <Text size="sm">{t("noIntegrationDescription")}</Text>
          <Group gap="xs">
            {session?.user.permissions.includes("integration-create") ? (
              <Button
                size="compact-sm"
                variant="light"
                onClick={() =>
                  openIntegrationModal({
                    allowedKinds:
                      definition && "supportedIntegrations" in definition
                        ? (definition.supportedIntegrations as readonly IntegrationKind[])
                        : [],
                    onSuccess: (created) => {
                      if (!created) return;
                      openConfigurationModal({ ...configuration.value, integrationIds: [created.integration.id] }, [
                        created.integration,
                      ]);
                    },
                  })
                }
              >
                {t("connectIntegration")}
              </Button>
            ) : (
              <Button component="a" href="/manage/integrations" size="compact-sm" variant="light">
                {t("manageIntegrations")}
              </Button>
            )}
            <Button
              size="compact-sm"
              variant="default"
              onClick={() =>
                addResult({
                  boardId: args.boardId,
                  kind: args.kind,
                  cancelled: true,
                  reason: "no-compatible-integration",
                })
              }
            >
              {t("skip")}
            </Button>
          </Group>
        </Stack>
      </Alert>
    );
  }

  const WidgetIcon = widgetImports[args.kind].definition.icon;
  return (
    <Box className={classes.appTool}>
      <Group gap="sm" align="flex-start" wrap="nowrap">
        <ThemeIcon variant="light" size="lg" radius="md">
          <WidgetIcon size={20} />
        </ThemeIcon>
        <Box miw={0} flex={1}>
          <Text fw={700}>{fullT(`widget.${args.kind}.name`)}</Text>
          <Text size="sm" c="dimmed">
            {args.summary}
          </Text>
        </Box>
      </Group>
      <Button mt="md" fullWidth leftSection={<IconSettings size={17} />} onClick={() => openConfigurationModal()}>
        {t("review")}
      </Button>
    </Box>
  );
};
