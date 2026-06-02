import type { ReactNode } from "react";
import { Center, Group, Loader, Stack, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import { interaction } from "../../../../lib/interaction";

export const PreferenceDetailHeader = ({ titleKey }: { titleKey: string }) => {
  const tOption = useScopedI18n("search.mode.command.group.preferences.option");
  const t = useScopedI18n("search.mode.command.group.preferences");

  return (
    <Stack mx="md" my="sm" gap="xs">
      <Text>{tOption(titleKey as never)}</Text>
      <Text size="xs" c="dimmed">
        {t("children.detail.backHint")}
      </Text>
    </Stack>
  );
};

export const createCheckmarkPreferenceAction = ({
  key,
  label,
  labelContent,
  isSelected,
  onSelect,
  dimmed,
  isPending,
}: {
  key: string;
  label?: string;
  labelContent?: ReactNode;
  isSelected: boolean;
  onSelect: () => void;
  dimmed?: boolean;
  isPending?: boolean;
}) => ({
  key,
  Component() {
    return (
      <Group mx="md" my="sm" wrap="nowrap" justify="space-between" w="100%" opacity={isPending ? 0.5 : 1}>
        {labelContent ?? <Text c={dimmed ? "dimmed" : undefined}>{label}</Text>}
        {isSelected && <IconCheck color="currentColor" size={24} />}
      </Group>
    );
  },
  useInteraction: interaction.javaScript(() => ({
    onSelect: isPending ? () => undefined : onSelect,
    closeSpotlightOnTrigger: false,
  })),
});

export const createLoadingPreferenceAction = () => ({
  key: "loading",
  Component() {
    return (
      <Center mx="md" my="sm">
        <Loader size="sm" />
      </Center>
    );
  },
  useInteraction: interaction.javaScript(() => ({
    onSelect: () => undefined,
    closeSpotlightOnTrigger: false,
  })),
});
