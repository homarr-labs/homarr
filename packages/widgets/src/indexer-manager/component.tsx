"use client";

import { useCallback, useMemo } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Card,
  Center,
  Flex,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import { IconCircleCheck, IconCircleX, IconReportSearch, IconTestPipe } from "@tabler/icons-react";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { useWidgetRuntimeActions } from "../runtime-hooks";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
import actionTargetClasses from "../common/action-target.module.css";
import classes from "./component.module.css";
import { getIndexerDisplayStatus } from "./status";

const statusPresentation = {
  healthy: { color: "green" },
  unhealthy: { color: "red" },
  disabled: { color: "gray" },
} as const;

export default function IndexerManagerWidget({
  options,
  integrationIds,
  width,
  height,
  isEditMode,
  widgetRuntimeRef,
  displayMode,
}: WidgetComponentProps<"indexerManager">) {
  const t = useI18n();
  const indexersQuery = clientApi.widget.indexerManager.getIndexersStatus.useQuery({ integrationIds });
  const isInitialPending = isInitialWidgetQueryPending(indexersQuery);
  const indexersData = getUsableWidgetQueryData(indexersQuery) ?? [];

  const utils = clientApi.useUtils();
  const {
    mutate: testAll,
    isPending,
    error: testAllError,
  } = clientApi.widget.indexerManager.testAllIndexers.useMutation({
    onSettled: () => void utils.widget.indexerManager.getIndexersStatus.invalidate(),
  });
  const interactIntegrationIds = new Set(useIntegrationsWithInteractAccess().map(({ id }) => id));
  const canInteract = integrationIds.length > 0 && integrationIds.every((id) => interactIntegrationIds.has(id));
  const board = useRequiredBoard();
  const isAdvanced = displayMode === "advanced";
  const hasSmallWidth = !isAdvanced && width < 256;
  const isDense = !isAdvanced && (width < 280 || height < 180);
  const showHealthCounts = isAdvanced || (width >= 200 && height >= 100);
  const allIndexers = indexersData.flatMap((entry) => entry.indexers);
  const hasSourceError = indexersData.some((entry) => Boolean(entry.error));
  const unavailableCount = allIndexers.filter(
    (indexer) => indexer.status === false || indexer.enabled === false,
  ).length;

  const testAllIndexers = useCallback(() => {
    if (!canInteract || isPending) return;
    testAll({ integrationIds });
  }, [canInteract, integrationIds, isPending, testAll]);

  const runtimeActions = useMemo(() => ({ testAllIndexers }), [testAllIndexers]);
  useWidgetRuntimeActions(widgetRuntimeRef, runtimeActions);

  return (
    <Flex
      className={`indexer-manager-container ${classes.root}`}
      h="100%"
      direction="column"
      gap={isDense ? 4 : "xs"}
      p={isDense ? "xs" : "sm"}
    >
      <Group className="indexer-manager-title" align="center" gap="xs" wrap="nowrap" w="100%">
        {testAllError && <VisuallyHidden role="alert">{t("common.error")}</VisuallyHidden>}
        <Tooltip label={t("widget.indexerManager.title")} disabled={!hasSmallWidth}>
          <IconReportSearch
            className="indexer-manager-title-icon"
            size={hasSmallWidth ? 16 : 20}
            style={{ minWidth: hasSmallWidth ? 16 : 20 }}
          />
        </Tooltip>
        {!hasSmallWidth && (
          <Text size={isDense ? "xs" : "sm"} fw={600} truncate="end">
            {t("widget.indexerManager.title")}
          </Text>
        )}
        {showHealthCounts && (
          <Group gap={4} wrap="nowrap">
            <Badge size="xs" color="green" variant="light">
              {allIndexers.length - unavailableCount}
            </Badge>
            {unavailableCount > 0 && (
              <Badge size="xs" color="red" variant="light">
                {unavailableCount}
              </Badge>
            )}
          </Group>
        )}
        <WidgetQueryErrorIndicator error={indexersQuery.error} label={t("widget.indexerManager.title")} />
        <Tooltip label={testAllError ? t("common.error") : t("widget.indexerManager.testAll")}>
          <ActionIcon
            className={combineClasses("indexer-manager-test-action-icon", classes.testAction, actionTargetClasses.root)}
            size="sm"
            radius={board.itemRadius}
            variant="light"
            color={testAllError ? "red" : undefined}
            loading={isPending}
            disabled={isEditMode || !canInteract}
            loaderProps={{ type: "dots" }}
            onClick={() => {
              testAllIndexers();
            }}
            aria-label={t("widget.indexerManager.testAll")}
          >
            <IconTestPipe style={iconSizes.sm} />
          </ActionIcon>
        </Tooltip>
      </Group>
      <Card
        className={combineClasses("indexer-manager-list-container", classes.card)}
        w="100%"
        p={isDense ? 4 : "xs"}
        radius={board.itemRadius}
        flex={1}
      >
        {isInitialPending ? (
          <Center h="100%">
            <Loader size="sm" />
          </Center>
        ) : allIndexers.length === 0 && !hasSourceError ? (
          <WidgetEmptyState />
        ) : (
          <ScrollArea className="indexer-manager-list-scroll-area" h="100%" scrollbars="y">
            {indexersData.map(({ integrationId, integrationName, indexers, error }) => (
              <Stack gap={4} className={`indexer-manager-${integrationId}-list-container`} p={0} key={integrationId}>
                {(isAdvanced || indexersData.length > 1 || error) && (
                  <Group justify="space-between" wrap="nowrap" py={4}>
                    <Text size="xs" fw={600} truncate="end">
                      {integrationName}
                    </Text>
                    {error && (
                      <Badge size="xs" color="red" variant="light">
                        {t("common.error")}
                      </Badge>
                    )}
                  </Group>
                )}
                {indexers.map((indexer) => {
                  const href = getSafeApplicationUrl(indexer.url);
                  const displayStatus = getIndexerDisplayStatus(indexer);
                  const presentation = statusPresentation[displayStatus];
                  return (
                    <Group
                      className={`indexer-manager-line indexer-manager-${indexer.name} ${classes.indexerRow}`}
                      key={indexer.id}
                      justify="space-between"
                      gap="xs"
                      wrap="nowrap"
                    >
                      <Anchor
                        className={combineClasses("indexer-manager-line-anchor", classes.indexerLink)}
                        component={href ? "a" : "span"}
                        href={href}
                        target={href ? (options.openIndexerSiteInNewTab ? "_blank" : "_self") : undefined}
                        rel={href && options.openIndexerSiteInNewTab ? SAFE_NEW_TAB_REL : undefined}
                        title={href}
                      >
                        <Text
                          className="indexer-manager-line-anchor-text"
                          c="dimmed"
                          size={hasSmallWidth ? "xs" : "sm"}
                          truncate="end"
                        >
                          {indexer.name}
                        </Text>
                      </Anchor>
                      {isAdvanced ? (
                        <Badge size="xs" color={presentation.color} variant="light">
                          {t(`widget.indexerManager.status.${displayStatus}`)}
                        </Badge>
                      ) : displayStatus === "healthy" ? (
                        <IconCircleCheck
                          className="indexer-manager-line-status-icon indexer-manager-line-icon-enabled"
                          color="var(--mantine-color-green-6)"
                          size={hasSmallWidth ? 12 : 16}
                        />
                      ) : (
                        <IconCircleX
                          className="indexer-manager-line-status-icon indexer-manager-line-icon-disabled"
                          color="var(--mantine-color-red-6)"
                          size={hasSmallWidth ? 12 : 16}
                        />
                      )}
                    </Group>
                  );
                })}
              </Stack>
            ))}
          </ScrollArea>
        )}
      </Card>
    </Flex>
  );
}
