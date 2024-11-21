"use client";

import { useMemo } from "react";
import type { BoxProps } from "@mantine/core";
import { Avatar, AvatarGroup, Box, Card, Flex, Stack, Text, Tooltip } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { IconBarrierBlock, IconPercentage, IconSearch, IconWorldWww } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { formatNumber } from "@homarr/common";
import { integrationDefs } from "@homarr/definitions";
import type { DnsHoleSummary } from "@homarr/integrations/types";
import type { stringOrTranslation, TranslationFunction } from "@homarr/translation";
import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import type { widgetKind } from ".";
import type { WidgetComponentProps, WidgetProps } from "../../definition";
import { NoIntegrationSelectedError } from "../../errors";

export default function DnsHoleSummaryWidget({ options, integrationIds }: WidgetComponentProps<typeof widgetKind>) {
  const [summaries] = clientApi.widget.dnsHole.summary.useSuspenseQuery(
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

  clientApi.widget.dnsHole.subscribeToSummary.useSubscription(
    {
      integrationIds,
    },
    {
      onData: (data) => {
        utils.widget.dnsHole.summary.setData(
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

  if (integrationIds.length === 0) {
    throw new NoIntegrationSelectedError();
  }

  return (
    <Box h="100%" {...boxPropsByLayout(options.layout)} p="2cqmin">
      {data.length > 0 ? (
        stats.map((item) => (
          <StatCard key={item.color} item={item} usePiHoleColors={options.usePiHoleColors} data={data} t={t} />
        ))
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
            {t("widget.dnsHoleSummary.error.integrationsDisconnected")}
          </Text>
        </Stack>
      )}
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
    value: (data) =>
      `${formatNumber(
        data.reduce((count, { adsBlockedTodayPercentage }) => count + adsBlockedTodayPercentage, 0),
        2,
      )}%`,
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
  value: (x: DnsHoleSummary[]) => string;
  label: stringOrTranslation;
  color: string;
}

interface StatCardProps {
  item: StatItem;
  data: DnsHoleSummary[];
  usePiHoleColors: boolean;
  t: TranslationFunction;
}
const StatCard = ({ item, data, usePiHoleColors, t }: StatCardProps) => {
  const { ref, height, width } = useElementSize();
  const isLong = width > height + 20;

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
