"use client";

import { useCallback, useMemo } from "react";
import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
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
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { useWidgetRuntimeActions } from "../runtime-hooks";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
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
  const t = useI18n("widget.indexerManager");
  const tCommon = useI18n("common");
  const indexersQuery = clientApi.widget.indexerManager.getIndexersStatus.useQuery({ integrationIds });
  const isInitialPending = isInitialWidgetQueryPending(indexersQuery);
  const indexersData = getUsableWidgetQueryData(indexersQuery) ?? [];

  const utils = clientApi.useUtils();
  const {
    mutate: testAll,
    isPending,
    error: testAllError,
  } = clientApi.widget.indexerManager.testAllIndexers.useMutation({
    onError: () =>
      showErrorNotification({
        title: tCommon("error"),
        message: t("error.testAll"),
      }),
    onSettled: () => void utils.widget.indexerManager.getIndexersStatus.invalidate(),
  });
  const interactIntegrationIds = new Set(useIntegrationsWithInteractAccess().map(({ id }) => id));
  const canInteract = integrationIds.length > 0 && integrationIds.every((id) => interactIntegrationIds.has(id));
  const board = useRequiredBoard();
  const isAdvanced = displayMode === "advanced";
  const hasSmallWidth = !isAdvanced && width < 256;
  const hasSmallHeight = !isAdvanced && height < 256;
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
      gap={isAdvanced ? "xs" : "sm"}
      p="sm"
      align={isAdvanced ? undefined : "center"}
    >
      <Group
        className="indexer-manager-title"
        align="center"
        gap="xs"
        wrap="nowrap"
        w={isAdvanced ? "100%" : undefined}
      >
        {testAllError && <VisuallyHidden role="alert">{tCommon("error")}</VisuallyHidden>}
        <Tooltip label={t("title")} disabled={!hasSmallWidth}>
          <IconReportSearch
            className="indexer-manager-title-icon"
            style={hasSmallWidth ? iconSizes.md : iconSizes.xl}
          />
        </Tooltip>
        <Text
          size={hasSmallWidth ? "xs" : isAdvanced ? "sm" : "md"}
          fw={isAdvanced ? 600 : "bold"}
          truncate={isAdvanced ? "end" : undefined}
        >
          {t("title")}
        </Text>
        {isAdvanced && (
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
        {(isAdvanced || hasSmallHeight) && (
          <Tooltip label={testAllError ? tCommon("error") : t("testAll")}>
            <ActionIcon
              className={combineClasses(
                "indexer-manager-test-action-icon",
                isAdvanced && classes.testAction,
                actionTargetClasses.root,
              )}
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
              aria-label={t("testAll")}
            >
              <IconTestPipe style={isAdvanced ? iconSizes.sm : iconSizes.xs} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
      <Card
        className={combineClasses("indexer-manager-list-container", classes.card, isAdvanced && classes.advancedCard)}
        w="100%"
        p="xs"
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
                {(isAdvanced || error) && (
                  <Group justify="space-between" wrap="nowrap" py={4}>
                    <Text size="xs" fw={600} truncate="end">
                      {integrationName}
                    </Text>
                    {error && (
                      <Badge size="xs" color="red" variant="light">
                        {tCommon("error")}
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
                      className={combineClasses(
                        "indexer-manager-line",
                        `indexer-manager-${indexer.name}`,
                        isAdvanced && classes.indexerRow,
                      )}
                      key={indexer.id}
                      justify="space-between"
                      gap="xs"
                      wrap="nowrap"
                    >
                      <Anchor
                        className={combineClasses("indexer-manager-line-anchor", isAdvanced && classes.indexerLink)}
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
                          truncate={isAdvanced ? "end" : undefined}
                        >
                          {indexer.name}
                        </Text>
                      </Anchor>
                      {isAdvanced ? (
                        <Badge size="xs" color={presentation.color} variant="light">
                          {t(`status.${displayStatus}` as never)}
                        </Badge>
                      ) : displayStatus === "healthy" ? (
                        <IconCircleCheck
                          className="indexer-manager-line-status-icon indexer-manager-line-icon-enabled"
                          color="#2ecc71"
                          style={hasSmallWidth ? iconSizes.xs : iconSizes.md}
                        />
                      ) : (
                        <IconCircleX
                          className="indexer-manager-line-status-icon indexer-manager-line-icon-disabled"
                          color="#d9534f"
                          style={hasSmallWidth ? iconSizes.xs : iconSizes.md}
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
      {!isAdvanced && !hasSmallHeight && (
        <Button
          className="indexer-manager-test-button"
          w="100%"
          size="xs"
          radius={board.itemRadius}
          variant="light"
          color={testAllError ? "red" : undefined}
          leftSection={<IconTestPipe style={iconSizes.md} />}
          loading={isPending}
          disabled={isEditMode || !canInteract}
          loaderProps={{ type: "dots" }}
          onClick={() => {
            testAllIndexers();
          }}
        >
          {t("testAll")}
        </Button>
      )}
    </Flex>
  );
}
