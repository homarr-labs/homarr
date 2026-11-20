"use client";

import { useState } from "react";
import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { IconBuildingStore } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

export const CustomWidgetShareNudge = ({ definitionId }: { definitionId: string }) => {
  const [visible, setVisible] = useState(true);
  const t = useI18n("workshop");

  if (!visible) {
    return null;
  }

  return (
    <Alert icon={<IconBuildingStore size={20} />} title={t("share.title")}>
      <Stack gap="sm" align="flex-start">
        <Text size="sm">{t("share.description")}</Text>
        <Group gap="xs">
          <Button component={Link} href={`/manage/custom-widgets/publish/${definitionId}`} size="xs">
            {t("share.action")}
          </Button>
          <Button type="button" variant="subtle" size="xs" onClick={() => setVisible(false)}>
            {t("share.dismiss")}
          </Button>
        </Group>
      </Stack>
    </Alert>
  );
};
