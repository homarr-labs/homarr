"use client";

import { Badge, Card, Center, Group, List, ScrollArea, SimpleGrid, Stack, Text, useMantineTheme } from "@mantine/core";
import { IconCircleCheckFilled, IconCircleXFilled } from "@tabler/icons-react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import objectSupport from "dayjs/plugin/objectSupport";
import relativeTime from "dayjs/plugin/relativeTime";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import { getBinaryStatusKey } from "../../common/locale";
import { getUsableWidgetQueryData } from "../../common/query-state";

dayjs.extend(objectSupport);
dayjs.extend(relativeTime);
dayjs.extend(duration);

export default function NetworkControllerSummaryWidget({
  integrationIds,
  width,
  height,
}: WidgetComponentProps<"networkControllerSummary">) {
  const summaryQuery = clientApi.widget.networkController.summary.useQuery({
    integrationIds,
  });
  const summaries = getUsableWidgetQueryData(summaryQuery) ?? [];
  const { isPending } = summaryQuery;

  const t = useI18n();
  const statusLabels = {
    enabled: t("widget.dnsHoleSummary.status.enabled"),
    disabled: t("widget.dnsHoleSummary.status.disabled"),
    unknown: t("widget.dnsHoleSummary.status.unknown"),
  };

  const isDense = height < 160;
  const showDetails = height >= 180 && width >= 240;
  const columns = width >= 720 ? 2 : 1;

  if (isPending || summaries.length === 0) {
    return (
      <Center h="100%" p="sm">
        <Text c="dimmed" size="sm" ta="center">
          {isPending ? t("common.action.loading") : t("widget.networkControllerSummary.error.integrationsDisconnected")}
        </Text>
      </Center>
    );
  }

  return (
    <ScrollArea h="100%" p={isDense ? "xs" : "sm"}>
      <SimpleGrid cols={columns} spacing="sm">
        {summaries.map(({ integration, summary }) => (
          <Card key={integration.id} p={isDense ? "xs" : "sm"} withBorder={summaries.length > 1}>
            <Stack gap="xs">
              {summaries.length > 1 && (
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={600} size="sm" truncate="end">
                    {integration.name}
                  </Text>
                  <Badge size="xs" variant="light">
                    {integration.kind}
                  </Badge>
                </Group>
              )}
              <List spacing={isDense ? 2 : "xs"} center size={isDense ? "sm" : undefined}>
                <List.Item
                  icon={
                    <StatusIcon
                      status={summary.wanStatus}
                      label={statusLabels[getBinaryStatusKey(summary.wanStatus)]}
                      size={isDense ? 16 : 20}
                    />
                  }
                >
                  {t("widget.networkControllerSummary.card.wan")}
                </List.Item>
                <List.Item
                  icon={
                    <StatusIcon
                      status={summary.www.status}
                      label={statusLabels[getBinaryStatusKey(summary.www.status)]}
                      size={isDense ? 16 : 20}
                    />
                  }
                >
                  <Text>
                    {t("widget.networkControllerSummary.card.web")}
                    <Text c="dimmed" size="sm" ms="xs" span>
                      {summary.www.latency}ms{showDetails ? ` · ${summary.www.ping}ms` : ""}
                    </Text>
                  </Text>
                </List.Item>
                <List.Item
                  icon={
                    <StatusIcon
                      status={summary.wifi.status}
                      label={statusLabels[getBinaryStatusKey(summary.wifi.status)]}
                      size={isDense ? 16 : 20}
                    />
                  }
                >
                  {t("widget.networkControllerSummary.card.wifi")}
                  {showDetails ? ` · ${summary.wifi.users + summary.wifi.guests}` : ""}
                </List.Item>
                {showDetails && (
                  <List.Item
                    icon={
                      <StatusIcon
                        status={summary.lan.status}
                        label={statusLabels[getBinaryStatusKey(summary.lan.status)]}
                        size={20}
                      />
                    }
                  >
                    {t("widget.networkControllerSummary.card.lan")} · {summary.lan.users + summary.lan.guests}
                  </List.Item>
                )}
                <List.Item
                  icon={
                    <StatusIcon
                      status={summary.vpn.status}
                      label={statusLabels[getBinaryStatusKey(summary.vpn.status)]}
                      size={isDense ? 16 : 20}
                    />
                  }
                >
                  <Text>
                    {t("widget.networkControllerSummary.card.vpn.label")}
                    <Text c="dimmed" size="sm" ms="xs" span>
                      {t("widget.networkControllerSummary.card.vpn.countConnected", { count: summary.vpn.users })}
                    </Text>
                  </Text>
                </List.Item>
              </List>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </ScrollArea>
  );
}

const StatusIcon = ({ status, label, size }: { status?: "enabled" | "disabled"; label: string; size: number }) => {
  const mantineTheme = useMantineTheme();
  if (status === "enabled") {
    return <IconCircleCheckFilled aria-label={label} size={size} color={mantineTheme.colors.green[6]} />;
  }
  if (status === "disabled") {
    return <IconCircleXFilled aria-label={label} size={size} color={mantineTheme.colors.red[6]} />;
  }
  return <IconCircleXFilled aria-label={label} size={size} color={mantineTheme.colors.gray[6]} />;
};
