"use client";

import { Badge, Box, Group, ScrollArea, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";

import { clientApi } from "@homarr/api/client";
import { calculateBoardUiScale } from "@homarr/boards/scale";
import { useI18n } from "@homarr/translation/client";

import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";
import { getCoolifyAttentionItems, getCoolifySectionVisibility } from "./coolify-utils";
import { InstanceView } from "./instance-view";
import type { InstanceData } from "./types";

const FAILED_SOURCES_HEIGHT = 32;
const INSTANCE_GAP = 8;

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
  // The advanced view is drawn in a larger surface than the board tile, so it measures its own box.
  const { ref: rootRef, width: measuredWidth, height: measuredHeight } = useElementSize<HTMLDivElement>();
  const renderedWidth = isAdvanced && measuredWidth > 0 ? measuredWidth : width / uiScale;
  const renderedHeight = isAdvanced && measuredHeight > 0 ? measuredHeight : height / uiScale;
  const visibleOptions = getCoolifySectionVisibility(options, displayMode);
  const instancesQuery = clientApi.widget.coolify.getInstancesInfo.useQuery({ integrationIds });
  const instancesData = getUsableWidgetQueryData(instancesQuery) ?? [];
  const successfulInstances = instancesData.filter(
    (instance): instance is InstanceData => instance.instanceInfo !== null,
  );
  const failedInstances = instancesData.filter((instance) => instance.instanceInfo === null);

  if (integrationIds.length === 0) {
    return (
      <div className={classes.root}>
        <Text c="dimmed" ta="center" p="xs" size="sm">
          {t("error.noIntegration")}
        </Text>
      </div>
    );
  }
  if (instancesQuery.isPending) {
    return (
      <div className={classes.root}>
        <Text c="dimmed" ta="center" p="xs" size="sm">
          {tCommon("action.loading")}
        </Text>
      </div>
    );
  }
  if (successfulInstances.length === 0) {
    return (
      <div className={classes.root}>
        <FailedSourceBadges sources={failedInstances} queryError={instancesQuery.error} isAdvanced={isAdvanced} />
        <Box style={{ minHeight: 0, flex: 1 }}>
          <WidgetEmptyState />
        </Box>
      </div>
    );
  }

  const orderedInstances = successfulInstances.toSorted(
    (first, second) =>
      getCoolifyAttentionItems(second.instanceInfo, visibleOptions).length -
      getCoolifyAttentionItems(first.instanceInfo, visibleOptions).length,
  );
  const failedHeight = failedInstances.length ? FAILED_SOURCES_HEIGHT : 0;
  const maxCompactInstances = Math.max(1, Math.floor((renderedHeight - failedHeight) / 120));
  const visibleInstances = isAdvanced ? orderedInstances : orderedInstances.slice(0, maxCompactInstances);
  const isSingle = visibleInstances.length === 1;
  const widgetKey = integrationIds.toSorted().join("-");
  const useTwoColumns = isAdvanced && renderedWidth >= 760 && visibleInstances.length > 1;
  const hasHiddenInstances = !isAdvanced && orderedInstances.length > visibleInstances.length;
  const outerPadding = isSingle ? 0 : INSTANCE_GAP * 2;
  const rows = useTwoColumns ? Math.ceil(visibleInstances.length / 2) : visibleInstances.length;
  const availableHeight =
    renderedHeight - failedHeight - outerPadding - (hasHiddenInstances ? 20 : 0) - INSTANCE_GAP * (rows - 1);
  const instanceHeight = isAdvanced
    ? isSingle
      ? Math.max(320, renderedHeight - failedHeight)
      : Math.max(420, Math.floor(availableHeight / Math.min(rows, 2)))
    : Math.max(64, Math.floor(availableHeight / rows));
  const instanceWidth = useTwoColumns
    ? Math.floor((renderedWidth - outerPadding - INSTANCE_GAP) / 2)
    : renderedWidth - outerPadding;

  return (
    <div ref={rootRef} className={classes.root} data-advanced={isAdvanced || undefined}>
      <FailedSourceBadges sources={failedInstances} queryError={instancesQuery.error} isAdvanced={isAdvanced} />
      <ScrollArea style={{ minHeight: 0, flex: 1 }} type={isAdvanced && !isSingle ? "auto" : "never"}>
        <div className={classes.instances} data-single={isSingle || undefined} data-columns={useTwoColumns ? 2 : 1}>
          {visibleInstances.map((instance) => (
            <Box key={instance.integrationId} h={instanceHeight}>
              <InstanceView
                instance={instance}
                options={visibleOptions}
                isAdvanced={isAdvanced}
                isSingle={isSingle}
                storageKey={`coolify-show-ip-${integrationIds.length > 1 ? `${widgetKey}-${instance.integrationId}` : widgetKey}`}
                width={instanceWidth}
                height={instanceHeight}
                uiScale={uiScale}
              />
            </Box>
          ))}
        </div>
        {hasHiddenInstances && (
          <Text className={classes.moreInstances} size="xs">
            {t("summary.moreInstances", { count: orderedInstances.length - visibleInstances.length })}
          </Text>
        )}
      </ScrollArea>
    </div>
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
