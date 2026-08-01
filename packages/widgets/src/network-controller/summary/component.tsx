"use client";

import { Badge, Card, Group, List, ScrollArea, SimpleGrid, Stack, Text, useMantineTheme } from "@mantine/core";
import { IconCircleCheckFilled, IconCircleXFilled } from "@tabler/icons-react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import objectSupport from "dayjs/plugin/objectSupport";
import relativeTime from "dayjs/plugin/relativeTime";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";

dayjs.extend(objectSupport);
dayjs.extend(relativeTime);
dayjs.extend(duration);

export default function NetworkControllerSummaryWidget({
  integrationIds,
  width,
  displayMode,
}: WidgetComponentProps<"networkControllerSummary">) {
  const { data: summaries = [] } = clientApi.widget.networkController.summary.useQuery({
    integrationIds,
  });

  const t = useI18n();

  const isAdvanced = displayMode === "advanced";
  const columns = isAdvanced && width >= 720 ? 2 : 1;

  return (
    <ScrollArea h="100%" p={isAdvanced ? "md" : "sm"}>
      <SimpleGrid cols={columns} spacing="sm">
        {summaries.map(({ integration, summary }) => (
          <Card key={integration.id} p={isAdvanced ? "md" : "xs"} withBorder={summaries.length > 1 || isAdvanced}>
            <Stack gap="xs">
              {(isAdvanced || summaries.length > 1) && (
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={600} size="sm" truncate="end">
                    {integration.name}
                  </Text>
                  <Badge size="xs" variant="light">
                    {integration.kind}
                  </Badge>
                </Group>
              )}
              <List spacing="xs" center>
                <List.Item icon={<StatusIcon status={summary.wanStatus} />}>WAN</List.Item>
                <List.Item icon={<StatusIcon status={summary.www.status} />}>
                  <Text>
                    WWW
                    <Text c="dimmed" size="sm" ms="xs" span>
                      {summary.www.latency}ms{isAdvanced ? ` · ${summary.www.ping}ms` : ""}
                    </Text>
                  </Text>
                </List.Item>
                <List.Item icon={<StatusIcon status={summary.wifi.status} />}>
                  Wi-Fi{isAdvanced ? ` · ${summary.wifi.users + summary.wifi.guests}` : ""}
                </List.Item>
                {isAdvanced && (
                  <List.Item icon={<StatusIcon status={summary.lan.status} />}>
                    LAN · {summary.lan.users + summary.lan.guests}
                  </List.Item>
                )}
                <List.Item icon={<StatusIcon status={summary.vpn.status} />}>
                  <Text>
                    VPN
                    <Text c="dimmed" size="sm" ms="xs" span>
                      {t("widget.networkControllerSummary.card.vpn.countConnected", { count: `${summary.vpn.users}` })}
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

const StatusIcon = ({ status }: { status?: "enabled" | "disabled" }) => {
  const mantineTheme = useMantineTheme();
  if (status === "enabled") {
    return <IconCircleCheckFilled size={20} color={mantineTheme.colors.green[6]} />;
  }
  if (status === "disabled") return <IconCircleXFilled size={20} color={mantineTheme.colors.red[6]} />;
  return <IconCircleXFilled size={20} color={mantineTheme.colors.gray[6]} />;
};
