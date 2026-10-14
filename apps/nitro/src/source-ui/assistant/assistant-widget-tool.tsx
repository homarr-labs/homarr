import { Suspense, use, useMemo } from "react";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { Alert, Box, Button, Group, Skeleton, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconSettings } from "@tabler/icons-react";
import { ErrorBoundary } from "react-error-boundary";
import type { FallbackProps } from "react-error-boundary";

import { getWidgetName } from "@homarr/definitions";
import {
  isAssistantSourceReadCurrent,
  useAssistantSourceAction,
  useAssistantSourceBindings,
  useI18n,
} from "./bindings";
import type {
  AssistantWidgetDefinition,
  AssistantWidgetDefinitionAdapter,
  AssistantWidgetIntegration,
} from "./bindings";

import classes from "./assistant-panel.module.css";
import { useAssistantAutomaticAction } from "./assistant-auto-approval";
import { AssistantAutomaticActionProgress } from "./assistant-automatic-action-progress";
import { useAssistantToolOwnerLease, useAssistantToolReadOwner } from "./assistant-runtime-provider";
import { hasCompleteAssistantToolArguments, hasFailedAssistantToolArguments } from "./assistant-human-tool-status";
import type { ConfigureWidgetArgs, ConfigureWidgetResult } from "./assistant-tool-contracts";

export const getAssistantWidgetConfiguration = (
  definition: AssistantWidgetDefinition,
  args: ConfigureWidgetArgs,
  settings: { enableStatusByDefault: boolean; forceDisableStatus: boolean },
  integrations: AssistantWidgetIntegration[],
  reduceWidgetOptionsWithDefinition: AssistantWidgetDefinitionAdapter["reduceOptions"],
) => {
  const integrationSupport = "supportedIntegrations" in definition;
  const supportedIntegrations = integrationSupport ? (definition.supportedIntegrations ?? []) : [];
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
      options: reduceWidgetOptionsWithDefinition(settings, args.options),
      integrationIds,
    },
  };
};

type AssistantConfigureWidgetToolProps = ToolCallMessagePartProps<ConfigureWidgetArgs, ConfigureWidgetResult>;

export const AssistantConfigureWidgetTool = (props: AssistantConfigureWidgetToolProps) => {
  const bindings = useAssistantSourceBindings();
  const hasCompleteArguments = hasCompleteAssistantToolArguments(props.status);
  const completeArgs =
    props.result === undefined && !hasFailedAssistantToolArguments(props.status) && hasCompleteArguments
      ? props.args
      : undefined;

  if (!completeArgs) return <AssistantConfigureWidgetToolContent {...props} adapter={undefined} />;

  if (bindings.widgets.kind === "held") return <Alert color="yellow">{bindings.widgets.reason}</Alert>;

  return (
    <ErrorBoundary FallbackComponent={AssistantWidgetDefinitionErrorFallback} resetKeys={[completeArgs.kind]}>
      <Suspense fallback={<AssistantConfigureWidgetSkeleton />}>
        <LoadedAssistantConfigureWidgetTool {...props} args={completeArgs} />
      </Suspense>
    </ErrorBoundary>
  );
};

const AssistantWidgetDefinitionErrorFallback = ({ resetErrorBoundary }: FallbackProps) => {
  const t = useI18n("assistant.configureWidget");
  const actionT = useI18n("common.action");

  return (
    <Alert color="red" variant="light" title={t("definitionLoadErrorTitle")} icon={<IconAlertTriangle size={18} />}>
      <Stack gap="sm">
        <Text size="sm">{t("definitionLoadErrorDescription")}</Text>
        <Button variant="light" color="red" size="compact-sm" w="fit-content" onClick={resetErrorBoundary}>
          {actionT("tryAgain")}
        </Button>
      </Stack>
    </Alert>
  );
};

const LoadedAssistantConfigureWidgetTool = (
  props: AssistantConfigureWidgetToolProps & { args: ConfigureWidgetArgs },
) => {
  const bindings = useAssistantSourceBindings();
  if (bindings.widgets.kind === "held") throw new Error(bindings.widgets.reason);
  const adapter = use(bindings.widgets.loadDefinition(props.args.kind));
  return <AssistantConfigureWidgetToolContent {...props} adapter={adapter} />;
};

const AssistantConfigureWidgetSkeleton = () => {
  const t = useI18n("assistant.configureWidget");
  return (
    <Box className={classes.appTool} aria-label={t("preparing")}>
      <Stack gap="sm">
        <Skeleton height={18} width="45%" />
        <Skeleton height={14} width="76%" />
        <Skeleton height={38} />
      </Stack>
    </Box>
  );
};

const AssistantConfigureWidgetToolContent = ({
  args,
  result,
  addResult,
  status,
  toolCallId,
  adapter,
}: AssistantConfigureWidgetToolProps & { adapter: AssistantWidgetDefinitionAdapter | undefined }) => {
  const bindings = useAssistantSourceBindings();
  const action = useAssistantSourceAction("configureWidget");
  const t = useI18n("assistant.configureWidget");
  const actionT = useI18n("common.action");
  const fullT = useI18n();
  const resources = bindings.widgets;
  const definition = adapter?.definition;
  const hasCompleteArguments = hasCompleteAssistantToolArguments(status);
  const needsIntegrations = definition !== undefined && "supportedIntegrations" in definition;
  const readOwner = useAssistantToolReadOwner(toolCallId);
  const integrations = bindings.useWidgetIntegrations({
    enabled: result === undefined && hasCompleteArguments && needsIntegrations,
    owner: readOwner,
  });
  const integrationsCurrent = !needsIntegrations || isAssistantSourceReadCurrent(integrations, readOwner);
  const configuration = useMemo(() => {
    if (
      resources.kind === "held" ||
      !args ||
      !definition ||
      !adapter ||
      adapter.kind !== args.kind ||
      !hasCompleteArguments ||
      !integrationsCurrent
    )
      return null;
    return getAssistantWidgetConfiguration(
      definition,
      args,
      resources.settings,
      integrations.data ?? [],
      adapter.reduceOptions,
    );
  }, [adapter, args, definition, hasCompleteArguments, integrations.data, integrationsCurrent, resources]);
  const missingRequiredIntegration =
    configuration?.integrationsRequired === true && configuration.value.integrationIds.length === 0;
  const ready = action.enabled && resources.kind === "available" && result === undefined && configuration !== null;
  const lease = useAssistantToolOwnerLease({ toolCallId, args, evidence: configuration, ready });
  const autoConfirming = useAssistantAutomaticAction({
    toolCallId,
    ready: ready && !missingRequiredIntegration,
    completed: result !== undefined,
    confirm: () => {
      if (!args || !configuration || !action.enabled || !integrationsCurrent || !lease.isCurrent()) return;
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
            {args?.kind ? getWidgetName(args.kind, fullT) : t("title")}
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

  if (resources.kind === "held") return <Alert color="yellow">{resources.reason}</Alert>;
  if (integrations.unavailableReason && needsIntegrations)
    return <Alert color="yellow">{integrations.unavailableReason}</Alert>;

  if (!hasCompleteArguments || !args || (needsIntegrations && integrations.isPending)) {
    return <AssistantConfigureWidgetSkeleton />;
  }

  if (integrations.isError && needsIntegrations) {
    return (
      <Alert color="red" variant="light" title={t("loadErrorTitle")} icon={<IconAlertTriangle size={18} />}>
        <Stack gap="sm">
          <Text size="sm">{t("loadErrorDescription")}</Text>
          <Button
            variant="light"
            color="red"
            size="compact-sm"
            w="fit-content"
            disabled={!integrations.refetch}
            onClick={() => void integrations.refetch?.()}
          >
            {actionT("tryAgain")}
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (!integrationsCurrent || !configuration || !definition || !adapter)
    return <Alert color="yellow">{bindings.unavailableLabel}</Alert>;

  const openConfigurationModal = (
    value = configuration.value,
    integrationData: AssistantWidgetIntegration[] = configuration.integrationData,
    isCurrentOwner = lease.acquire(),
  ) => {
    if (!action.enabled || !integrationsCurrent || !isCurrentOwner()) return;
    let settled = false;
    adapter.openWidgetModal(
      {
        kind: args.kind,
        value,
        integrationData,
        integrationSupport: configuration.integrationSupport,
        settings: resources.settings,
        onSuccessfulEdit: ({ options, integrationIds }) => {
          if (settled || !action.enabled || !integrationsCurrent || !isCurrentOwner()) return;
          settled = true;
          addResult({ boardId: args.boardId, kind: args.kind, options, integrationIds });
        },
      },
      {
        title: (titleT) => `${titleT("item.edit.title")} - ${getWidgetName(args.kind, titleT)}`,
      },
    );
  };

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
            {resources.canCreateIntegration ? (
              <Button
                size="compact-sm"
                variant="light"
                disabled={!action.enabled}
                onClick={() => {
                  const isCurrentOwner = lease.acquire();
                  if (!action.enabled || !integrationsCurrent || !isCurrentOwner()) return;
                  let continued = false;
                  resources.openIntegrationModal({
                    allowedKinds:
                      definition && "supportedIntegrations" in definition
                        ? (definition.supportedIntegrations ?? [])
                        : [],
                    onSuccess: (created) => {
                      if (continued || !created || !action.enabled || !integrationsCurrent || !isCurrentOwner()) return;
                      if (
                        !created.integration.permissions.hasUseAccess ||
                        !definition.supportedIntegrations?.includes(created.integration.kind)
                      )
                        return;
                      continued = true;
                      openConfigurationModal(
                        { ...configuration.value, integrationIds: [created.integration.id] },
                        [created.integration],
                        isCurrentOwner,
                      );
                    },
                  });
                }}
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
              disabled={!action.enabled}
              onClick={() => {
                if (!action.enabled || !integrationsCurrent || !lease.isCurrent()) return;
                addResult({
                  boardId: args.boardId,
                  kind: args.kind,
                  cancelled: true,
                  reason: "no-compatible-integration",
                });
              }}
            >
              {t("skip")}
            </Button>
          </Group>
        </Stack>
      </Alert>
    );
  }

  const WidgetIcon = definition.icon;
  return (
    <Box className={classes.appTool}>
      <Group gap="sm" align="flex-start" wrap="nowrap">
        <ThemeIcon variant="light" size="lg" radius="md">
          <WidgetIcon size={20} />
        </ThemeIcon>
        <Box miw={0} flex={1}>
          <Text fw={700}>{getWidgetName(args.kind, fullT)}</Text>
          <Text size="sm" c="dimmed">
            {args.summary}
          </Text>
        </Box>
      </Group>
      {!action.enabled && (
        <Alert color="yellow" mt="md">
          {action.reason}
        </Alert>
      )}
      <Button
        mt="md"
        fullWidth
        leftSection={<IconSettings size={17} />}
        disabled={!action.enabled}
        onClick={() => {
          if (action.enabled && integrationsCurrent && lease.isCurrent()) openConfigurationModal();
        }}
      >
        {t("review")}
      </Button>
    </Box>
  );
};
