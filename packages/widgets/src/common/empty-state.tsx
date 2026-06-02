import { Center, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

export const WidgetEmptyState = () => {
  const t = useI18n();

  return (
    <Center h="100%" w="100%" p="sm">
      <Text c="dimmed" size="sm" ta="center">
        {t("widget.common.error.noData")}
      </Text>
    </Center>
  );
};
