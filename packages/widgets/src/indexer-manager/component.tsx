"use client";

import { useEffect, useMemo } from "react";
import { ActionIcon, Anchor, Badge, Card, Flex, Group, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import { IconCircleCheck, IconCircleX, IconReportSearch, IconTestPipe } from "@tabler/icons-react";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

export default function IndexerManagerWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode,
  isEditMode,
  widgetStateRef,
}: WidgetComponentProps<"indexerManager">) {
  const t = useI18n();
  const { data: indexersData = [] } = clientApi.widget.indexerManager.getIndexersStatus.useQuery({ integrationIds });

  const utils = clientApi.useUtils();
  const { mutate: testAll, isPending } = clientApi.widget.indexerManager.testAllIndexers.useMutation({
    onSettled: () => void utils.widget.indexerManager.getIndexersStatus.invalidate(),
  });
  const board = useRequiredBoard();
  const isAdvanced = displayMode === "advanced";
  const hasSmallWidth = !isAdvanced && width < 256;
  const isDense = !isAdvanced && (width < 280 || height < 180);
  const allIndexers = useMemo(() => indexersData.flatMap((entry) => entry.indexers), [indexersData]);
  const unavailableCount = allIndexers.filter(
    (indexer) => indexer.status === false || indexer.enabled === false,
  ).length;

  useEffect(() => {
    if (!widgetStateRef) return;
    widgetStateRef.current = {
      ...widgetStateRef.current,
      testAllIndexers: () => testAll({ integrationIds }),
    };
    return () => {
      if (widgetStateRef.current) delete widgetStateRef.current.testAllIndexers;
    };
  }, [integrationIds, testAll, widgetStateRef]);

  return (
    <Flex
      className={`indexer-manager-container ${classes.root}`}
      h="100%"
      direction="column"
      gap={isDense ? 4 : "xs"}
      p={isDense ? "xs" : "sm"}
    >
      <Group className="indexer-manager-title" align="center" gap="xs" wrap="nowrap" w="100%">
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
        <Tooltip label={t("widget.indexerManager.testAll")}>
          <ActionIcon
            className={combineClasses("indexer-manager-test-action-icon", classes.testAction)}
            size="sm"
            radius={board.itemRadius}
            variant="light"
            loading={isPending}
            disabled={isEditMode}
            loaderProps={{ type: "dots" }}
            onClick={() => {
              testAll({ integrationIds });
            }}
            aria-label={t("widget.indexerManager.testAll")}
          >
            <IconTestPipe size={14} />
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
        <ScrollArea className="indexer-manager-list-scroll-area" h="100%" scrollbars="y">
          {indexersData.map(({ integrationId, integrationName, indexers, error }) => (
            <Stack gap={4} className={`indexer-manager-${integrationId}-list-container`} p={0} key={integrationId}>
              {(isAdvanced || indexersData.length > 1) && (
                <Group justify="space-between" wrap="nowrap" py={4}>
                  <Text size="xs" fw={600} truncate="end">
                    {integrationName}
                  </Text>
                  {error && (
                    <Tooltip label={error} multiline maw={360}>
                      <Badge size="xs" color="red" variant="light">
                        {t("common.error")}
                      </Badge>
                    </Tooltip>
                  )}
                </Group>
              )}
              {indexers.map((indexer) => (
                <Group
                  className={`indexer-manager-line indexer-manager-${indexer.name} ${classes.indexerRow}`}
                  key={indexer.id}
                  justify="space-between"
                  gap="xs"
                  wrap="nowrap"
                >
                  <Anchor
                    className="indexer-manager-line-anchor"
                    href={indexer.url}
                    target={options.openIndexerSiteInNewTab ? "_blank" : "_self"}
                    rel={options.openIndexerSiteInNewTab ? "noopener noreferrer" : undefined}
                    style={{ minWidth: 0, flex: 1 }}
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
                  {isAdvanced && (
                    <Text size="xs" c="dimmed" truncate="end" style={{ flex: 1 }}>
                      {indexer.url}
                    </Text>
                  )}
                  {indexer.status === false || indexer.enabled === false ? (
                    <IconCircleX
                      className="indexer-manager-line-status-icon indexer-manager-line-icon-disabled"
                      color="#d9534f"
                      size={hasSmallWidth ? 12 : 16}
                    />
                  ) : (
                    <IconCircleCheck
                      className="indexer-manager-line-status-icon indexer-manager-line-icon-enabled"
                      color="#2ecc71"
                      size={hasSmallWidth ? 12 : 16}
                    />
                  )}
                </Group>
              ))}
            </Stack>
          ))}
        </ScrollArea>
      </Card>
    </Flex>
  );
}
