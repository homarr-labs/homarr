"use client";

import { useEffect, useMemo } from "react";
import { ActionIcon, Anchor, Badge, Button, Card, Flex, Group, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
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
  const hasSmallHeight = !isAdvanced && height < 256;
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
    <Flex className="indexer-manager-container" h="100%" direction="column" gap="sm" p="sm" align="center">
      <Group className="indexer-manager-title" align="center" gap="xs" wrap="nowrap">
        <IconReportSearch
          className="indexer-manager-title-icon"
          size={hasSmallWidth ? 16 : 20}
          style={{ minWidth: hasSmallWidth ? 16 : 20 }}
        />
        <Text size={hasSmallWidth ? "xs" : "md"} fw="bold">
          {t("widget.indexerManager.title")}
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
        {hasSmallHeight && (
          <ActionIcon
            className="indexer-manager-test-action-icon"
            size="sm"
            radius={board.itemRadius}
            variant="light"
            loading={isPending}
            disabled={isEditMode}
            loaderProps={{ type: "dots" }}
            onClick={() => {
              testAll({ integrationIds });
            }}
          >
            <IconTestPipe size={12} />
          </ActionIcon>
        )}
      </Group>
      <Card
        className={combineClasses("indexer-manager-list-container", classes.card)}
        w="100%"
        p="xs"
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
                  className={`indexer-manager-line indexer-manager-${indexer.name}`}
                  key={indexer.id}
                  justify="space-between"
                  gap="xs"
                  wrap="nowrap"
                >
                  <Anchor
                    className="indexer-manager-line-anchor"
                    href={indexer.url}
                    target={options.openIndexerSiteInNewTab ? "_blank" : "_self"}
                  >
                    <Text className="indexer-manager-line-anchor-text" c="dimmed" size={hasSmallWidth ? "xs" : "sm"}>
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
      {!hasSmallHeight && (
        <Button
          className="indexer-manager-test-button"
          w="100%"
          size="xs"
          radius={board.itemRadius}
          variant="light"
          leftSection={<IconTestPipe size={"1rem"} />}
          loading={isPending}
          disabled={isEditMode}
          loaderProps={{ type: "dots" }}
          onClick={() => {
            testAll({ integrationIds });
          }}
        >
          {t("widget.indexerManager.testAll")}
        </Button>
      )}
    </Flex>
  );
}
