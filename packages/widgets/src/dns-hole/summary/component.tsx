"use client";

import type { BoxProps } from "@mantine/core";
import { Box, Card, Center, Flex, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import {
  IconBarrierBlock,
  IconPercentage,
  IconSearch,
  IconWorldWww,
} from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { formatNumber, formatPercentage } from "@homarr/common";
import { translateIfNecessary } from "@homarr/translation";
import type { stringOrTranslation } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import type { WidgetComponentProps, WidgetProps } from "../../definition";

export default function DnsHoleSummaryWidget({
  options,
  serverData,
  integrations,
}: WidgetComponentProps<"dnsHoleSummary">) {
  // TODO: this is an issue
  const integrationId = integrations.at(0) as unknown as string | undefined;
  const { data, isPending } = clientApi.widget.dnsHole.summary.useQuery(
    {
      integrationId: integrationId!,
    },
    {
      enabled: Boolean(integrationId),
      initialData:
        serverData?.initialData?.integrationId === integrationId
          ? serverData?.initialData
          : undefined,
      refetchOnMount: false,
    },
  );

  if (!data || isPending) {
    return <div>Loading... {integrationId}</div>;
  }

  return (
    <Box h="100%" {...boxPropsByLayout(options.layout)}>
      {stats.map((item, index) => (
        <StatCard
          key={index}
          item={item}
          usePiHoleColors={options.usePiHoleColors}
          data={data}
        />
      ))}
    </Box>
  );
}

const stats = [
  {
    icon: IconBarrierBlock,
    value: ({ adsBlockedToday }) => formatNumber(adsBlockedToday, 2),
    label: (t) => t("widget.dnsHoleSummary.data.adsBlockedToday"),
    color: "rgba(240, 82, 60, 0.4)",
  },
  {
    icon: IconPercentage,
    value: ({ adsBlockedTodayPercentage }) =>
      formatPercentage(adsBlockedTodayPercentage, 2),
    label: (t) => t("widget.dnsHoleSummary.data.adsBlockedTodayPercentage"),
    color: "rgba(255, 165, 20, 0.4)",
  },
  {
    icon: IconSearch,
    value: ({ dnsQueriesToday }) => formatNumber(dnsQueriesToday, 2),
    label: (t) => t("widget.dnsHoleSummary.data.dnsQueriesToday"),
    color: "rgba(0, 175, 218, 0.4)",
  },
  {
    icon: IconWorldWww,
    value: ({ domainsBeingBlocked }) => formatNumber(domainsBeingBlocked, 2),
    label: (t) => t("widget.dnsHoleSummary.data.domainsBeingBlocked"),
    color: "rgba(0, 176, 96, 0.4)",
  },
] satisfies StatItem[];

interface StatItem {
  icon: TablerIcon;
  value: (x: RouterOutputs["widget"]["dnsHole"]["summary"]) => string;
  label: stringOrTranslation;
  color: string;
}

interface StatCardProps {
  item: StatItem;
  data: RouterOutputs["widget"]["dnsHole"]["summary"];
  usePiHoleColors: boolean;
}
const StatCard = ({ item, data, usePiHoleColors }: StatCardProps) => {
  const { ref, height, width } = useElementSize();
  const isLong = width > height + 20;
  const t = useI18n();

  return (
    <Card
      ref={ref}
      m="0.4rem"
      p="0.2rem"
      bg={usePiHoleColors ? item.color : "rgba(96, 96, 96, 0.1)"}
      style={{
        flex: 1,
      }}
      withBorder
    >
      <Center h="100%" w="100%">
        <Flex
          h="100%"
          w="100%"
          align="center"
          justify="space-evenly"
          direction={isLong ? "row" : "column"}
        >
          <item.icon size={30} style={{ margin: "0 10" }} />
          <Flex
            justify="center"
            direction="column"
            style={{
              flex: isLong ? 1 : undefined,
            }}
          >
            <Text ta="center" lh={1.2} size="md" fw="bold">
              {item.value(data)}
            </Text>
            {item.label && (
              <Text ta="center" lh={1.2} size="0.75rem">
                {translateIfNecessary(t, item.label)}
              </Text>
            )}
          </Flex>
        </Flex>
      </Center>
    </Card>
  );
};

const boxPropsByLayout = (
  layout: WidgetProps<"dnsHoleSummary">["options"]["layout"],
): BoxProps => {
  if (layout === "grid") {
    return {
      display: "grid",
      style: {
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
      },
    };
  }

  return {
    display: "flex",
    style: {
      flexDirection: layout,
    },
  };
};
