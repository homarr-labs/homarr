"use client";

import { Badge, Box, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { calculateBoardUiScale } from "@homarr/boards/scale";
import { useI18n } from "@homarr/translation/client";

import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { getCoolifyAttentionItems, getCoolifySectionVisibility } from "./coolify-utils";
import { InstanceView } from "./instance-view";
import type { InstanceData } from "./types";

export default function CoolifyWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode,
  displayScale = 1,
}: WidgetComponentProps<"coolify">) {
  const t = useI18n("widget.coolify");
  const tCommon = useI18n("common");
  const isAdvanced = displayMode === "advanced";
  const uiScale = isAdvanced ? 1 : calculateBoardUiScale(displayScale);
  const renderedWidth = width / uiScale;
  const renderedHeight = height / uiScale;
  const visibleOptions = getCoolifySectionVisibility(options, displayMode);
  const instancesQuery = clientApi.widget.coolify.getInstancesInfo.useQuery({ integrationIds });
  const instancesData = getUsableWidgetQueryData(instancesQuery) ?? [];
  const successfulInstances = instancesData.filter(
    (instance): instance is InstanceData => instance.instanceInfo !== null,
  );
  const failedInstances = instancesData.filter((instance) => instance.instanceInfo === null);

  if (integrationIds.length === 0) {
    return (
      <Text c="dimmed" ta="center" p="xs">
        {t("error.noIntegration")}
      </Text>
    );
  }
  if (instancesQuery.isPending) {
    return (
      <Text c="dimmed" ta="center" p="xs">
        {tCommon("action.loading")}
      </Text>
    );
  }
  if (successfulInstances.length === 0) {
    return (
      <Stack h="100%" gap={0}>
        <FailedSourceBadges sources={failedInstances} queryError={instancesQuery.error} isAdvanced={isAdvanced} />
        <Box style={{ minHeight: 0, flex: 1 }}>
          <WidgetEmptyState />
        </Box>
      </Stack>
    );
  }

  const orderedInstances = successfulInstances.toSorted(
    (first, second) =>
      getCoolifyAttentionItems(second.instanceInfo, visibleOptions).length -
      getCoolifyAttentionItems(first.instanceInfo, visibleOptions).length,
  );
  const maxCompactInstances = Math.max(1, Math.floor((renderedHeight - (failedInstances.length ? 32 : 0)) / 120));
  const visibleInstances = isAdvanced ? orderedInstances : orderedInstances.slice(0, maxCompactInstances);
  const useTwoColumns = isAdvanced && renderedWidth >= 760 && visibleInstances.length > 1;
  const hasHiddenInstances = !isAdvanced && orderedInstances.length > visibleInstances.length;
  const compactAvailableHeight =
    renderedHeight -
    (failedInstances.length ? 32 : 0) -
    16 -
    (hasHiddenInstances ? 20 : 0) -
    8 * (visibleInstances.length - 1);
  const instanceHeight = isAdvanced
    ? Math.max(260, Math.min(550, renderedHeight - 32))
    : Math.max(70, Math.floor(compactAvailableHeight / visibleInstances.length));

  return (
    <Stack h="100%" gap={0}>
      <FailedSourceBadges sources={failedInstances} queryError={instancesQuery.error} isAdvanced={isAdvanced} />
      <ScrollArea style={{ minHeight: 0, flex: 1 }} type={isAdvanced ? "auto" : "never"}>
        <SimpleGrid cols={useTwoColumns ? 2 : 1} spacing="xs" p="xs">
          {visibleInstances.map((instance) => (
            <Box key={instance.integrationId} h={instanceHeight}>
              <InstanceView
                instance={instance}
                options={visibleOptions}
                isAdvanced={isAdvanced}
                isSingle={visibleInstances.length === 1}
                width={useTwoColumns ? Math.floor(renderedWidth / 2) - 16 : renderedWidth - 16}
                height={instanceHeight}
              />
            </Box>
          ))}
        </SimpleGrid>
        {hasHiddenInstances && (
          <Text size="xs" c="dimmed" px="xs">
            {t("summary.moreInstances", { count: orderedInstances.length - visibleInstances.length })}
          </Text>
        )}
      </ScrollArea>
    </Stack>
  );
}

const FailedSourceBadges = ({
  sources,
  queryError,
  isAdvanced,
}: {
  sources: { integrationId: string; integrationName: string }[];
  queryError: unknown;
  isAdvanced: boolean;
}) => {
  const t = useI18n("widget.coolify");
  if (sources.length === 0 && !queryError) return null;
  return (
    <Group gap={4} p="xs" pb={0} wrap="wrap">
      {!isAdvanced && sources.length > 0 && (
        <Badge color="red" variant="light" size="xs">
          {t("source.unavailableCount", { count: sources.length })}
        </Badge>
      )}
      {isAdvanced &&
        sources.map((source) => (
          <Badge key={source.integrationId} color="red" variant="light" size="xs">
            {t("source.unavailable", { source: source.integrationName })}
          </Badge>
        ))}
      {sources.length === 0 && Boolean(queryError) && (
        <Badge color="red" variant="light" size="xs">
          {t("error.internalServerError")}
        </Badge>
      )}
    </Group>
  );
};
