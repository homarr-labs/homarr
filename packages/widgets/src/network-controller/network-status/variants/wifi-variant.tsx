import { Group, SimpleGrid, Text } from "@mantine/core";
import { IconWifi } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { StatRow } from "./stat-row";

export const WifiVariant = ({
  countGuests,
  countUsers,
  compact = false,
  horizontal = false,
}: {
  countUsers: number;
  countGuests: number;
  compact?: boolean;
  horizontal?: boolean;
}) => {
  const t = useI18n("widget.networkControllerStatus.card");
  return (
    <>
      <Group gap="xs" wrap="nowrap" mb={compact ? "xs" : "md"}>
        <IconWifi size={24} />
        <Text size={"md"} fw={"bold"}>
          {t("variants.wifi.name")}
        </Text>
      </Group>
      <SimpleGrid cols={horizontal ? 2 : 1} spacing={compact ? "sm" : "lg"}>
        <StatRow label={t("users.label")} value={countUsers} compact={compact} />
        <StatRow label={t("guests.label")} value={countGuests} compact={compact} />
      </SimpleGrid>
    </>
  );
};
