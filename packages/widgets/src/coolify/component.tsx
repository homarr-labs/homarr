"use client";

import { Badge, Box, Group, ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { createWidgetKey, getCoolifySectionVisibility } from "./coolify-utils";
import { InstanceCard } from "./instance-card";
import { SingleInstanceLayout } from "./single-instance-layout";
import type { InstanceData } from "./types";

export default function CoolifyWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"coolify">) {
  const t = useI18n("widget.coolify");

  if (integrationIds.length === 0) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text c="dimmed">{t("error.noIntegration")}</Text>
      </Stack>
    );
  }

  const isAdvanced = displayMode === "advanced";
  const sectionVisibility = getCoolifySectionVisibility(options, displayMode);

  return (
    <CoolifyContent
      integrationIds={integrationIds}
      options={{ ...options, ...sectionVisibility }}
      width={width}
      height={height}
      isAdvanced={isAdvanced}
    />
  );
}

interface CoolifyContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"coolify">["options"];
  width: number;
  height: number;
  isAdvanced: boolean;
}

function CoolifyContent({ integrationIds, options, width, height, isAdvanced }: CoolifyContentProps) {
  const t = useI18n("common");
  const instancesQuery = clientApi.widget.coolify.getInstancesInfo.useQuery({
    integrationIds,
  });
  const instancesData = getUsableWidgetQueryData(instancesQuery) ?? [];
  const { isPending } = instancesQuery;
  const successfulInstances = instancesData.filter(
    (instance): instance is InstanceData => instance.instanceInfo !== null,
  );
  const failedInstances = instancesData.filter((instance) => instance.instanceInfo === null);

  const isTiny = width < 256 || height < 144;
  const hideFooter = height < 112;
  const [firstInstance] = successfulInstances;
  const widgetKey = createWidgetKey(integrationIds);

  if (isPending) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text c="dimmed" size="sm">
          {t("action.loading")}
        </Text>
      </Stack>
    );
  }
  if (successfulInstances.length === 0) {
    return (
      <Stack h="100%" gap={0}>
        <FailedSourceBadges sources={failedInstances} queryError={instancesQuery.error} />
        <Box style={{ minHeight: 0, flex: 1 }}>
          <WidgetEmptyState />
        </Box>
      </Stack>
    );
  }

  if (successfulInstances.length === 1 && firstInstance) {
    return (
      <Stack h="100%" gap={0}>
        <FailedSourceBadges sources={failedInstances} queryError={instancesQuery.error} />
        <div style={{ minHeight: 0, flex: 1 }}>
          <SingleInstanceLayout
            instance={firstInstance}
            options={options}
            isTiny={!isAdvanced && isTiny}
            isAdvanced={isAdvanced}
            widgetKey={widgetKey}
            hideFooter={!isAdvanced && hideFooter}
          />
        </div>
      </Stack>
    );
  }

  return (
    <Stack h="100%" gap={0}>
      <FailedSourceBadges sources={failedInstances} queryError={instancesQuery.error} />
      <ScrollArea style={{ minHeight: 0, flex: 1 }}>
        <SimpleGrid cols={width >= 760 ? 2 : 1} spacing="sm" p="xs">
          {successfulInstances.map((instance) => (
            <InstanceCard
              key={instance.integrationId}
              instance={instance}
              options={options}
              isTiny={!isAdvanced && isTiny}
              isAdvanced={isAdvanced}
              widgetKey={widgetKey}
              hideFooter={!isAdvanced && hideFooter}
            />
          ))}
        </SimpleGrid>
      </ScrollArea>
    </Stack>
  );
}

const FailedSourceBadges = ({
  sources,
  queryError,
}: {
  sources: { integrationId: string; integrationName: string }[];
  queryError: unknown;
}) => {
  const t = useI18n("widget.coolify");
  if (sources.length === 0 && !queryError) return null;

  return (
    <Group gap={4} p="xs" pb={0} wrap="wrap">
      {sources.map((source) => (
        <Badge key={source.integrationId} color="red" variant="light" size="xs">
          {t("source.unavailable", { source: source.integrationName })}
        </Badge>
      ))}
    </Group>
  );
};
