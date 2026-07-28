"use client";

import { Center, Group, Loader, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

interface WidgetMobileSummaryProps {
  value: number | string;
  label: string;
  description?: string;
  isStale?: boolean;
}

export function WidgetMobileSummary({ value, label, description, isStale = false }: WidgetMobileSummaryProps) {
  const t = useI18n();

  return (
    <Center h="100%" p="sm">
      <Stack align="center" gap={2} w="100%" style={{ minWidth: 0 }}>
        <Text fz="xl" fw={700} lh={1.15} ta="center" w="100%" lineClamp={2} style={{ overflowWrap: "anywhere" }}>
          {value}
        </Text>
        <Text size="sm" fw={600} lineClamp={1} ta="center" w="100%">
          {label}
        </Text>
        {description !== undefined && (
          <Text c="var(--mantine-color-text)" size="xs" lineClamp={1} ta="center" w="100%">
            {description}
          </Text>
        )}
        {isStale && (
          <Group component="output" gap={4} justify="center" wrap="nowrap" w="100%">
            <IconAlertTriangle
              size={14}
              color="light-dark(var(--mantine-color-yellow-9), var(--mantine-color-yellow-3))"
              aria-hidden
            />
            <Text c="var(--mantine-color-text)" size="xs" lineClamp={1}>
              {t("board.mobile.dataWarning")}
            </Text>
          </Group>
        )}
      </Stack>
    </Center>
  );
}

export function WidgetMobileLoading() {
  const t = useI18n();

  return (
    <Center component="output" h="100%" aria-label={t("common.action.loading")}>
      <Loader size="sm" />
    </Center>
  );
}
