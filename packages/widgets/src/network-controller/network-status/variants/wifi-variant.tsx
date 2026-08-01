import { Group, Stack, Text } from "@mantine/core";
import { IconWifi } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import { StatRow } from "./stat-row";

export const WifiVariant = ({
  countGuests,
  countUsers,
  compact = false,
}: {
  countUsers: number;
  countGuests: number;
  compact?: boolean;
}) => {
  const t = useScopedI18n("widget.networkControllerStatus.card");
  return (
    <>
      <Group gap="xs" wrap="nowrap" mb={compact ? "xs" : "md"}>
        <IconWifi size={24} />
        <Text size={"md"} fw={"bold"}>
          {t("variants.wifi.name")}
        </Text>
      </Group>
      <Stack gap={compact ? "sm" : "lg"}>
        <StatRow label={t("users.label")} value={countUsers} compact={compact} />
        <StatRow label={t("guests.label")} value={countGuests} compact={compact} />
      </Stack>
    </>
  );
};
