import type { ReactNode } from "react";
import { Center, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

interface WidgetEmptyStateProps {
  message?: ReactNode;
}

export const WidgetEmptyState = ({ message }: WidgetEmptyStateProps) => {
  const t = useI18n("widget.common.error");

  return (
    <Center h="100%" w="100%" p="sm">
      <Text c="dimmed" size="sm" ta="center">
        {message ?? t("noData")}
      </Text>
    </Center>
  );
};
