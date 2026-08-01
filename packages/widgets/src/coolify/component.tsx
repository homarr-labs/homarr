"use client";

import { ScrollArea, SimpleGrid, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { createWidgetKey } from "./coolify-utils";
import { InstanceCard } from "./instance-card";
import { SingleInstanceLayout } from "./single-instance-layout";

export default function CoolifyWidget({
  options,
  integrationIds,
  width,
  displayMode,
}: WidgetComponentProps<"coolify">) {
  const t = useScopedI18n("widget.coolify");

  if (integrationIds.length === 0) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text c="dimmed">{t("error.noIntegration")}</Text>
      </Stack>
    );
  }

  return (
    <CoolifyContent
      integrationIds={integrationIds}
      options={options}
      width={width}
      isAdvanced={displayMode === "advanced"}
    />
  );
}

interface CoolifyContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"coolify">["options"];
  width: number;
  isAdvanced: boolean;
}

function CoolifyContent({ integrationIds, options, width, isAdvanced }: CoolifyContentProps) {
  const { data: instancesData = [] } = clientApi.widget.coolify.getInstancesInfo.useQuery({ integrationIds });

  const isTiny = !isAdvanced && width < 256;
  const [firstInstance] = instancesData;
  const widgetKey = createWidgetKey(integrationIds);

  if (instancesData.length === 1 && firstInstance) {
    return (
      <SingleInstanceLayout
        instance={firstInstance}
        options={options}
        isTiny={isTiny}
        widgetKey={widgetKey}
        isAdvanced={isAdvanced}
      />
    );
  }

  return (
    <ScrollArea h="100%">
      <SimpleGrid cols={isAdvanced && width >= 760 ? 2 : 1} spacing="sm" p="xs">
        {instancesData.map((instance) => (
          <InstanceCard
            key={instance.integrationId}
            instance={instance}
            options={options}
            isTiny={isTiny}
            widgetKey={widgetKey}
            isAdvanced={isAdvanced}
          />
        ))}
      </SimpleGrid>
    </ScrollArea>
  );
}
