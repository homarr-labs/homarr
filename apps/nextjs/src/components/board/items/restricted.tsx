import { Center, Group, Stack, Text } from "@mantine/core";
import { IconShield } from "@tabler/icons-react";

import type { WidgetKind } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";

interface RestrictedWidgetProps {
  kind: WidgetKind;
}

export const RestrictedWidgetContent = ({ kind }: RestrictedWidgetProps) => {
  const tCurrentWidget = useScopedI18n(`widget.${kind}`);
  const tCommonWidget = useScopedI18n("widget.common");

  return (
    <Center h="100%">
      <Stack ta="center" gap="xs" align="center">
        <Group gap="sm">
          <IconShield size={16} />
          <Text size="sm" fw="bold">
            {tCommonWidget("restricted.title")}
          </Text>
        </Group>
        <Text size="sm">{tCommonWidget("restricted.description", { name: tCurrentWidget("name") })}</Text>
      </Stack>
    </Center>
  );
};
