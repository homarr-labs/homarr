"use client";

import { Alert, Anchor, Text } from "@mantine/core";
import { IconFlask } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

const FEEDBACK_URL = "https://github.com/homarr-labs/homarr/discussions/categories/custom-widgets";

export function CustomWidgetBetaBanner() {
  const t = useI18n("customWidget.betaBanner");

  return (
    <Alert variant="light" color="yellow" title={t("title")} icon={<IconFlask />}>
      <Text size="sm">
        {t("description")}{" "}
        <Anchor href={FEEDBACK_URL} target="_blank" fw={600}>
          {t("discussionLink")}
        </Anchor>{" "}
        {t("closing")}
      </Text>
    </Alert>
  );
}
