import { Center, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconWifi } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import { iconSizes, zoomCompensatedSize } from "@homarr/ui";

import { StatRow } from "./stat-row";

export const WifiVariant = ({
  countGuests,
  countUsers,
  advanced = false,
  compact = false,
  horizontal = false,
  inline = false,
}: {
  countUsers: number;
  countGuests: number;
  advanced?: boolean;
  compact?: boolean;
  horizontal?: boolean;
  inline?: boolean;
}) => {
  const t = useI18n("widget.networkControllerStatus.card");
  if (!advanced) {
    const iconSize = horizontal ? 20 : 24;
    let titleMargin: 0 | "xs" | "md" = "md";
    if (compact) titleMargin = "xs";
    if (horizontal) titleMargin = 0;
    let statsSpacing: number | "xs" | "lg" = "lg";
    if (compact) statsSpacing = "xs";
    if (horizontal) statsSpacing = 4;
    return (
      <>
        <Group gap="xs" wrap="nowrap" mb={titleMargin}>
          <IconWifi style={zoomCompensatedSize(iconSize)} />
          <Text size="md" fw="bold" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
            {t("variants.wifi.name")}
          </Text>
        </Group>
        <SimpleGrid cols={horizontal ? 2 : 1} spacing={statsSpacing}>
          <StatRow label={t("users.label")} value={countUsers} compact={compact} inline={inline} />
          <StatRow label={t("guests.label")} value={countGuests} compact={compact} inline={inline} />
        </SimpleGrid>
      </>
    );
  }

  return (
    <Stack h="100%" align="center" justify="center" gap={compact ? "sm" : "md"}>
      <Group gap="xs" wrap="nowrap" justify="center">
        <Center w={24} h={24}>
          <IconWifi style={iconSizes.xl} />
        </Center>
        <Text size={"md"} fw={"bold"}>
          {t("variants.wifi.name")}
        </Text>
      </Group>
      <SimpleGrid cols={horizontal ? 2 : 1} spacing={compact ? "sm" : "lg"} w="100%" maw={horizontal ? 360 : 220}>
        <StatRow label={t("users.label")} value={countUsers} compact={compact} advanced />
        <StatRow label={t("guests.label")} value={countGuests} compact={compact} advanced />
      </SimpleGrid>
    </Stack>
  );
};
