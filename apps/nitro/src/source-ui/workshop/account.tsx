import { Button, Group, Text, Tooltip } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

export function WorkshopAccountButton({ name, hold }: { name?: string; hold: string }) {
  const t = useI18n("workshop");
  if (name !== undefined) {
    return (
      <Group gap="xs" wrap="nowrap">
        <Text size="sm" c="dimmed" lineClamp={1}>
          {name}
        </Text>
        <Tooltip label={hold}>
          <span>
            <Button disabled variant="subtle" color="gray" size="compact-sm">
              {t("signOut")}
            </Button>
          </span>
        </Tooltip>
      </Group>
    );
  }
  return (
    <Tooltip label={hold}>
      <span>
        <Button disabled variant="default" leftSection={<IconBrandGithub size={16} />}>
          {t("signIn")}
        </Button>
      </span>
    </Tooltip>
  );
}
