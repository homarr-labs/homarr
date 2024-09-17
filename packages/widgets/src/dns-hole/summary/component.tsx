"use client";

import { useMemo, useState } from "react";
import type { BoxProps } from "@mantine/core";
import { Box, Card, Flex, Text } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconBarrierBlock, IconPercentage, IconSearch, IconWorldWww } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { formatNumber } from "@homarr/common";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import type { stringOrTranslation, TranslationFunction } from "@homarr/translation";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import { widgetKind } from ".";
import type { WidgetComponentProps, WidgetProps } from "../../definition";
import { NoIntegrationSelectedError } from "../../errors";

export default function DnsHoleSummaryWidget({
  options,
  integrationIds,
  serverData,
}: WidgetComponentProps<typeof widgetKind>) {
  const [summaries, setSummaries] = useState(serverData?.initialData ?? []);

  clientApi.widget.dnsHole.subscribeToSummary.useSubscription(
    {
      widgetKind,
      integrationIds,
    },
    {
      onData: (data) => {
        setSummaries((prevSummaries) =>
          prevSummaries.map((summary) => (summary.integration.id === data.integration.id ? data : summary)),
        );
      },
    },
  );

  const data = useMemo(
    () =>
      summaries
        .filter(
          (
            pair,
          ): pair is {
            integration: typeof pair.integration;
            timestamp: typeof pair.timestamp;
            summary: DnsHoleSummary;
          } => pair.summary !== null,
        )
        .flatMap(({ summary }) => summary),
    [summaries, serverData],
  );

  if (integrationIds.length === 0) {
    throw new NoIntegrationSelectedError();
  }

  return (
    <Box h="100%" {...boxPropsByLayout(options.layout)} p="2cqmin">
      {stats.map((item, index) => (
        <StatCard key={index} item={item} usePiHoleColors={options.usePiHoleColors} data={data} />
      ))}
    </Box>
  );
}

const stats = [
  {
    icon: IconBarrierBlock,
    value: (data) =>
      formatNumber(
        data.reduce((count, { adsBlockedToday }) => count + adsBlockedToday, 0),
        2,
      ),
    label: (t) => t("widget.dnsHoleSummary.data.adsBlockedToday"),
    color: "rgba(240, 82, 60, 0.4)", // RED
  },
  {
    icon: IconPercentage,
    value: (data, t) =>
      t("common.rtl", {
        value: formatNumber(
          data.reduce((count, { adsBlockedTodayPercentage }) => count + adsBlockedTodayPercentage, 0),
          2,
        ),
        symbol: "%",
      }),
    label: (t) => t("widget.dnsHoleSummary.data.adsBlockedTodayPercentage"),
    color: "rgba(255, 165, 20, 0.4)", // YELLOW
  },
  {
    icon: IconSearch,
    value: (data) =>
      formatNumber(
        data.reduce((count, { dnsQueriesToday }) => count + dnsQueriesToday, 0),
        2,
      ),
    label: (t) => t("widget.dnsHoleSummary.data.dnsQueriesToday"),
    color: "rgba(0, 175, 218, 0.4)", // BLUE
  },
  {
    icon: IconWorldWww,
    value: (data) =>
      formatNumber(
        data.reduce((count, { domainsBeingBlocked }) => count + domainsBeingBlocked, 0),
        2,
      ),
    label: (t) => t("widget.dnsHoleSummary.data.domainsBeingBlocked"),
    color: "rgba(0, 176, 96, 0.4)", // GREEN
  },
] satisfies StatItem[];

interface StatItem {
  icon: TablerIcon;
  value: (x: DnsHoleSummary[], t: TranslationFunction) => string;
  label: stringOrTranslation;
  color: string;
}

interface StatCardProps {
  item: StatItem;
  data: DnsHoleSummary[];
  usePiHoleColors: boolean;
}
const StatCard = ({ item, data, usePiHoleColors }: StatCardProps) => {
  const { ref, height, width } = useElementSize();
  const isLong = width > height + 20;
  const t = useI18n();

  return (
    <Card
      ref={ref}
      className="summary-card"
      m="2cqmin"
      p="2.5cqmin"
      bg={usePiHoleColors ? item.color : "rgba(96, 96, 96, 0.1)"}
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
            key={item.value(data, t)}
            className="summary-card-value text-flash"
            ta="center"
            size="20cqmin"
            fw="bold"
            style={{ "--glow-size": "2.5cqmin" }}
          >
            {item.value(data, t)}
          </Text>
          {item.label && (
            <Text className="summary-card-label" ta="center" size="15cqmin">
              {translateIfNecessary(t, item.label)}
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};

const boxPropsByLayout = (layout: WidgetProps<"dnsHoleSummary">["options"]["layout"]): BoxProps => {
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
