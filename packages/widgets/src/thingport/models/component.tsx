"use client";

import { useState } from "react";
import { Box, Center, Group, Image, ScrollArea, Stack, Tabs, Text, UnstyledButton } from "@mantine/core";
import { IconClockPlus, IconCube, IconEye, IconPrinter } from "@tabler/icons-react";
import { getQueryKey } from "@trpc/react-query";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { clientApi } from "@homarr/api/client";
import type { RouterOutputs } from "@homarr/api";
import { thingportModelLists } from "@homarr/integrations/types";
import type { ThingportModelList } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../../common/application-url";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../../common/query-state";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import type { WidgetComponentProps } from "../../definition";
import { useWidgetRuntimeQueries } from "../../runtime-hooks";
import { getRenderedSize } from "../common/rendered-size";
import { canShowThingportHeader, ThingportWidgetHeader } from "../common/widget-header";
import classes from "./component.module.css";

dayjs.extend(relativeTime);

type ThingportModel = RouterOutputs["widget"]["thingport"]["getModels"][number];

const tabIcons = {
  recentlyAdded: IconClockPlus,
  topViewed: IconEye,
  topPrinted: IconPrinter,
} as const satisfies Record<ThingportModelList, unknown>;

const isModelList = (value: string | null): value is ThingportModelList =>
  thingportModelLists.some((list) => list === value);

export default function ThingportModelsWidget({
  integrationIds,
  options,
  widgetRuntimeRef,
  ...sizeProps
}: WidgetComponentProps<"thingport-models">) {
  const { width, height } = getRenderedSize(sizeProps);
  const t = useI18n("widget.thingport-models");
  const [activeTab, setActiveTab] = useState<ThingportModelList>(options.defaultTab);
  const input = { integrationId: integrationIds[0] ?? "", list: activeTab, limit: options.itemCount };
  const query = clientApi.widget.thingport.getModels.useQuery(input);
  const models = getUsableWidgetQueryData(query);
  useWidgetRuntimeQueries(widgetRuntimeRef, [getQueryKey(clientApi.widget.thingport.getModels, input, "query")]);
  // Below this the three labelled tabs no longer fit on one line, so they show only their icons.
  const isNarrow = width < 380;
  const showHeader = options.showTitle && canShowThingportHeader(width, height);

  const tabs = (
    <Tabs
      value={activeTab}
      keepMounted={false}
      onChange={(value) => {
        if (isModelList(value)) setActiveTab(value);
      }}
      flex={1}
      mih={0}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <Tabs.List grow style={{ flexWrap: "nowrap" }}>
        {thingportModelLists.map((list) => {
          const Icon = tabIcons[list];
          return (
            <Tabs.Tab
              key={list}
              value={list}
              px={isNarrow ? 6 : undefined}
              title={t(`tab.${list}`)}
              leftSection={<Icon size="var(--mantine-font-size-sm)" />}
            >
              {isNarrow ? null : t(`tab.${list}`)}
            </Tabs.Tab>
          );
        })}
      </Tabs.List>

      <Tabs.Panel value={activeTab} flex={1} mih={0}>
        {isInitialWidgetQueryPending(query) ? (
          <WidgetQueryLoadingState />
        ) : !models || models.length === 0 ? (
          <Center h="100%" p="sm">
            <Text c="dimmed" size="sm" ta="center">
              {t(`empty.${activeTab}`)}
            </Text>
          </Center>
        ) : (
          <ScrollArea h="100%">
            <Stack gap={2} p={4}>
              {models.map((model) => (
                <ModelRow
                  key={model.id}
                  model={model}
                  list={activeTab}
                  showThumbnail={options.showThumbnails}
                  openInNewTab={options.openInNewTab}
                />
              ))}
            </Stack>
          </ScrollArea>
        )}
      </Tabs.Panel>
    </Tabs>
  );

  return (
    <Stack h="100%" gap={4} p={showHeader ? 4 : 0}>
      {showHeader && (
        <Box px={4} pt={4}>
          <ThingportWidgetHeader title={t("title")} />
        </Box>
      )}
      {tabs}
    </Stack>
  );
}

interface ModelRowProps {
  model: ThingportModel;
  list: ThingportModelList;
  showThumbnail: boolean;
  openInNewTab: boolean;
}

function ModelRow({ model, list, showThumbnail, openInNewTab }: ModelRowProps) {
  const t = useI18n("widget.thingport-models");
  const href = getSafeApplicationUrl(model.href);
  const detail = {
    recentlyAdded: dayjs(model.createdAt).fromNow(),
    topViewed: t("views", { count: model.viewCount }),
    topPrinted: t("prints", { count: model.printCount }),
  }[list];

  return (
    <UnstyledButton
      component="a"
      href={href}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? SAFE_NEW_TAB_REL : undefined}
      className={classes.row}
    >
      <Group gap="sm" wrap="nowrap">
        {showThumbnail &&
          (model.thumbnailUrl ? (
            <Image src={model.thumbnailUrl} alt="" className={classes.thumbnail} loading="lazy" />
          ) : (
            <Center className={classes.thumbnail}>
              <IconCube size={18} stroke={1.5} />
            </Center>
          ))}
        <Stack gap={0} miw={0} flex={1}>
          <Text size="sm" fw={500} truncate="end" title={model.name}>
            {model.name}
          </Text>
          <Text size="xs" c="dimmed" truncate="end">
            {detail}
          </Text>
        </Stack>
      </Group>
    </UnstyledButton>
  );
}
