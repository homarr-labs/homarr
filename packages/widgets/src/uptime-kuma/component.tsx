"use client";

import { useMemo } from "react";
import { Box, List, Text, useMantineTheme, Center } from "@mantine/core";
import { IconCircleCheckFilled, IconCircleXFilled } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import type { UptimeKumaCheck } from "@homarr/integrations/types";

export default function UptimeKumaWidget({ options, integrationIds }: WidgetComponentProps<"uptimeKuma">) {
  const [result] = clientApi.widget.uptimeKuma.checks.useSuspenseQuery(
    { integrationIds },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  const utils = clientApi.useUtils();
  const t = useI18n();

  clientApi.widget.uptimeKuma.subscribeToChecks.useSubscription(
    { integrationIds },
    {
      onData: (data) => {
        utils.widget.uptimeKuma.checks.setData({ integrationIds }, (prev) => {
          if (!prev) {
            return undefined;
          }
          return prev.map((item) =>
            item.integration.id === data.integration.id
              ? { ...item, checks: data.checks }
              : item,
          );
        });
      },
    },
  );

  const allChecks = useMemo(() => result.flatMap((r) => r.checks), [result]);
  const selected: UptimeKumaCheck[] = useMemo(
    () => allChecks.filter((c) => options.checkIds.includes(c.id)),
    [allChecks, options.checkIds],
  );

  const StatusIcon = ({ status }: { status?: string | number }) => {
    const theme = useMantineTheme();
    const ok = status === "Up" || status === 1 || status === "up";
    if (ok) {
      return <IconCircleCheckFilled size={20} color={theme.colors.green[6]} />;
    }
    return <IconCircleXFilled size={20} color={theme.colors.red[6]} />;
  };

  if (selected.length === 0) {
    return (
      <Center h="100%">
        <Text c="dimmed">{t("widget.uptimeKuma.noChecks")}</Text>
      </Center>
    );
  }

  return (
    <Box h="100%" p="sm">
      <List spacing="xs" center>
        {selected.map((check) => (
          <List.Item key={check.id} icon={<StatusIcon status={check.status} />}>
            {check.name}
          </List.Item>
        ))}
      </List>
    </Box>
  );
}
