"use client";

import { ScrollArea, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { createWidgetKey } from "./coolify-utils";
import { InstanceCard } from "./instance-card";
import { SingleInstanceLayout } from "./single-instance-layout";

export default function CoolifyWidget({ options, integrationIds, width }: WidgetComponentProps<"coolify">) {
  const t = useScopedI18n("widget.coolify");

  if (integrationIds.length === 0) {
    return (
      <Stack align="center" justify="center" h="100%">
        <Text c="dimmed">{t("error.noIntegration")}</Text>
      </Stack>
    );
  }

  return <CoolifyContent integrationIds={integrationIds} options={options} width={width} />;
}

interface CoolifyContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"coolify">["options"];
  width: number;
}

function CoolifyContent({ integrationIds, options, width }: CoolifyContentProps) {
  const [instancesData] = clientApi.widget.coolify.getInstancesInfo.useSuspenseQuery({ integrationIds });

  const utils = clientApi.useUtils();
  clientApi.widget.coolify.subscribeInstancesInfo.useSubscription(
    { integrationIds },
    {
      onData(newData) {
        utils.widget.coolify.getInstancesInfo.setData({ integrationIds }, (prevData) => {
          if (!prevData) return prevData;
          return prevData.map((instance) =>
            instance.integrationId === newData.integrationId
              ? { ...instance, instanceInfo: newData.instanceInfo, updatedAt: newData.timestamp }
              : instance,
          );
        });
      },
    },
  );

  const isTiny = width < 256;
  const [firstInstance] = instancesData;
  const widgetKey = createWidgetKey(integrationIds);

  if (instancesData.length === 1 && firstInstance) {
    return <SingleInstanceLayout instance={firstInstance} options={options} isTiny={isTiny} widgetKey={widgetKey} />;
  }

  return (
    <ScrollArea h="100%">
      <Stack gap="xs" p="xs">
        {instancesData.map((instance) => (
          <InstanceCard
            key={instance.integrationId}
            instance={instance}
            options={options}
            isTiny={isTiny}
            widgetKey={widgetKey}
          />
        ))}
      </Stack>
    </ScrollArea>
  );
}
