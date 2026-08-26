import { Center, Group, SimpleGrid, Stack, Text } from "@mantine/core";
import { IconNetwork } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import { StatRow } from "./stat-row";

export const WiredVariant = ({
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
    <Stack h="100%" align="center" justify="center" gap={compact ? "sm" : "md"}>
      <Group gap="xs" wrap="nowrap" justify="center">
        <Center w={24} h={24}>
          <IconNetwork style={iconSizes.xl} />
        </Center>
        <Text size={"md"} fw={"bold"}>
          {t("variants.wired.name")}
        </Text>
      </Group>
      <SimpleGrid cols={horizontal ? 2 : 1} spacing={compact ? "sm" : "lg"} w="100%" maw={horizontal ? 360 : 220}>
        <StatRow label={t("users.label")} value={countUsers} compact={compact} />
        <StatRow label={t("guests.label")} value={countGuests} compact={compact} />
      </SimpleGrid>
    </Stack>
  );
};
