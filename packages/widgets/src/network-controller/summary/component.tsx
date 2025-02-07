"use client";

import { useMemo } from "react";
import type { BoxProps } from "@mantine/core";
import { Avatar, AvatarGroup, Box, Card, Flex, Stack, Text, Tooltip, TooltipFloating } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconShieldDown, IconTopologyBus, IconWifi, IconWorldWww } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { formatNumber } from "@homarr/common";
import { integrationDefs } from "@homarr/definitions";
import type { NetworkControllerSummary } from "@homarr/integrations/types";
import type { stringOrTranslation, TranslationFunction } from "@homarr/translation";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import type { widgetKind } from ".";
import type { WidgetComponentProps, WidgetProps } from "../../definition";

export default function NetworkControllerSummaryWidget({
  options,
  integrationIds,
}: WidgetComponentProps<typeof widgetKind>) {
  const [summaries] = clientApi.widget.networkController.summary.useSuspenseQuery(
    {
      integrationIds,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  const utils = clientApi.useUtils();

  const t = useI18n();

  clientApi.widget.networkController.subscribeToSummary.useSubscription(
    {
      integrationIds,
    },
    {
      onData: (data) => {
        utils.widget.networkController.summary.setData(
          {
            integrationIds,
          },
          (prevData) => {
            if (!prevData) {
              return undefined;
            }

            const newData = prevData.map((item) =>
              item.integration.id === data.integration.id ? { ...item, summary: data.summary } : item,
            );
            return newData;
          },
        );
      },
    },
  );

  const data = useMemo(() => summaries.flatMap(({ summary }) => summary), [summaries]);

  // prepare the blocks
  stats.length = 0;
  for (const layout of options.content) {
    switch (layout) {
      case "wifiUsers":
        stats.push(wifiUsersBlock);
        break;
      case "wifiGuests":
        stats.push(wifiGuestsBlock);
        break;
      case "lanUsers":
        stats.push(lanUsersBlock);
        break;
      case "lanGuests":
        stats.push(lanGuestsBlock);
        break;
      case "vpnUsers":
        stats.push(vpnUsersBlock);
        break;
      case "wwwLatency":
        stats.push(wwwLatencyBlock);
        break;
      case "wwwPing":
        stats.push(wwwPingBlock);
        break;
      case "wwwUptime":
        stats.push(wwwUptimeBlock);
        break;
      default:
        throw new Error(t("widget.networkControllerSummary.error.unknownContentOption"), layout);
    }
  }

  return (
    <Box h="100%" {...boxPropsByLayout(options.layout)} p="2cqmin">
      {data.length > 0 ? (
        stats.map((item) => <StatCard key={item.label.toString()} item={item} data={data} t={t} />)
      ) : (
        <Stack h="100%" w="100%" justify="center" align="center" gap="2.5cqmin" p="2.5cqmin">
          <AvatarGroup spacing="10cqmin">
            {summaries.map(({ integration }) => (
              <Tooltip key={integration.id} label={integration.name}>
                <Avatar h="35cqmin" w="35cqmin" src={integrationDefs[integration.kind].iconUrl} />
              </Tooltip>
            ))}
          </AvatarGroup>
          <Text fz="10cqmin" ta="center">
            {t("widget.networkControllerSummary.error.integrationsDisconnected")}
          </Text>
        </Stack>
      )}
    </Box>
  );
}

const stats = [
  {
    icon: IconWifi,
    value: (_) => {
      return "Default";
    },
    label: (t) => t("widget.networkControllerSummary.data.default"),
    color: "rgba(80, 80, 80, 0)",
  },
] satisfies StatItem[];

const wifiUsersBlock = {
  icon: IconWifi,
  value: (data) => {
    const summaryItem = data[0];
    if (summaryItem === undefined) {
      return "NaN";
    }
    return formatNumber(summaryItem.wifiUsers, 0);
  },
  label: (t) => t("widget.networkControllerSummary.data.wifiUsers"),
  color: "rgba(0, 176, 95, 0.4)",
} satisfies StatItem;

const wifiGuestsBlock = {
  icon: IconWifi,
  value: (data) => {
    const summaryItem = data[0];
    if (summaryItem === undefined) {
      return "NaN";
    }
    return formatNumber(summaryItem.wifiGuests, 0);
  },
  label: (t) => t("widget.networkControllerSummary.data.wifiGuests"),
  color: "rgba(0, 176, 94, 0.4)",
} satisfies StatItem;

const lanUsersBlock = {
  icon: IconTopologyBus,
  value: (data) => {
    const summaryItem = data[0];
    if (summaryItem === undefined) {
      return "NaN";
    }
    return formatNumber(summaryItem.lanUsers, 0);
  },
  label: (t) => t("widget.networkControllerSummary.data.lanUsers"),
  color: "rgba(0, 175, 217, 0.4)",
} satisfies StatItem;

const lanGuestsBlock = {
  icon: IconTopologyBus,
  value: (data) => {
    const summaryItem = data[0];
    if (summaryItem === undefined) {
      return "NaN";
    }
    return formatNumber(summaryItem.lanGuests, 0);
  },
  label: (t) => t("widget.networkControllerSummary.data.lanGuests"),
  color: "rgba(0, 175, 216, 0.4)",
} satisfies StatItem;

const vpnUsersBlock = {
  icon: IconShieldDown,
  value: (data) => {
    const summaryItem = data[0];
    if (summaryItem === undefined) {
      return "NaN";
    }
    return formatNumber(summaryItem.vpnUsers, 0);
  },
  label: (t) => t("widget.networkControllerSummary.data.vpnUsers"),
  color: "rgba(240, 82, 61, 0.4)",
} satisfies StatItem;

const wwwLatencyBlock = {
  icon: IconWorldWww,
  value: (data) => {
    const summaryItem = data[0];
    if (summaryItem === undefined) {
      return "NaN";
    }
    return formatNumber(summaryItem.wwwLatency, 0) + "ms";
  },
  label: (t) => t("widget.networkControllerSummary.data.wwwLatency"),
  color: "rgba(255, 165, 17, 0.4)",
} satisfies StatItem;

const wwwPingBlock = {
  icon: IconWorldWww,
  value: (data) => {
    const summaryItem = data[0];
    if (summaryItem === undefined) {
      return "NaN";
    }
    return formatNumber(summaryItem.wwwPing, 0) + "ms";
  },
  label: (t) => t("widget.networkControllerSummary.data.wwwPing"),
  color: "rgba(255, 165, 19, 0.4)",
} satisfies StatItem;

const wwwUptimeBlock = {
  icon: IconWorldWww,
  value: (data) => {
    const summaryItem = data[0];
    if (summaryItem === undefined) {
      return "NaN";
    }
    return secondsToDhms(summaryItem.wwwUptime);
  },
  label: (t) => t("widget.networkControllerSummary.data.wwwUptime"),
  color: "rgba(255, 165, 18, 0.4)",
} satisfies StatItem;

function secondsToDhms(seconds: number): string {
  seconds = Number(seconds);
  const day = Math.floor(seconds / (3600 * 24));
  const hour = Math.floor((seconds % (3600 * 24)) / 3600);
  const min = Math.floor((seconds % 3600) / 60);
  const sec = Math.floor(seconds % 60);

  if (day > 0) {
    return day + "d" + hour + "h" + min + "m";
  }
  if (hour > 0) {
    return hour + "h" + min + "m";
  }
  if (min > 0) {
    return min + "m" + sec + "s";
  }
  return sec + "s";
}

interface StatItem {
  icon: TablerIcon;
  value: (summaries: NetworkControllerSummary[]) => string;
  tooltip?: (summaries: NetworkControllerSummary[], t: TranslationFunction) => string | undefined;
  label: stringOrTranslation;
  color: string;
}

interface StatCardProps {
  item: StatItem;
  data: NetworkControllerSummary[];
  t: TranslationFunction;
}
const StatCard = ({ item, data, t }: StatCardProps) => {
  const { ref, height, width } = useElementSize();
  const isLong = width > height + 20;
  const tooltip = item.tooltip?.(data, t);

  return (
    <TooltipFloating label={tooltip} disabled={!tooltip} w={250} multiline>
      <Card
        ref={ref}
        className="summary-card"
        m="2cqmin"
        p="2.5cqmin"
        bg={item.color}
        style={{
          flex: 1,
        }}
        withBorder
      >
        <Flex
          className="summary-card-elements"
          h="100%"
          w="100%"
          align="center"
          justify="space-evenly"
          direction={isLong ? "row" : "column"}
          style={{ containerType: "size" }}
        >
          <item.icon className="summary-card-icon" size="40cqmin" style={{ margin: "2.5cqmin" }} />
          <Flex
            className="summary-card-texts"
            justify="center"
            direction="column"
            style={{
              flex: isLong ? 1 : undefined,
            }}
            w="100%"
            h="100%"
            gap="1cqmin"
          >
            <Text
              key={item.value(data)}
              className="summary-card-value text-flash"
              ta="center"
              size="20cqmin"
              fw="bold"
              style={{ "--glow-size": "2.5cqmin" }}
            >
              {item.value(data)}
            </Text>
            {item.label && (
              <Text className="summary-card-label" ta="center" size="15cqmin">
                {translateIfNecessary(t, item.label)}
              </Text>
            )}
          </Flex>
        </Flex>
      </Card>
    </TooltipFloating>
  );
};

const boxPropsByLayout = (layout: WidgetProps<"networkControllerSummary">["options"]["layout"]): BoxProps => {
  return {
    display: "flex",
    style: {
      flexDirection: layout,
    },
  };
};
