"use client";

import { Anchor, Badge, Group } from "@mantine/core";
import { IconFlask } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

const FEEDBACK_URL = "https://github.com/homarr-labs/homarr/discussions/categories/custom-widgets";

export function CustomWidgetBetaBanner() {
  const t = useI18n("customWidget.betaBanner");

  return (
    <Group gap="xs">
      <Badge variant="light" color="yellow" leftSection={<IconFlask size={12} />}>
        {t("title")}
      </Badge>
      <Anchor size="xs" href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer">
        {t("discussionLink")}
      </Anchor>
    </Group>
  );
}
