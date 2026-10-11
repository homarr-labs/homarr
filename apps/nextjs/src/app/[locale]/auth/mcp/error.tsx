"use client";

import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

export default function McpConsentError({ retry }: { retry: () => void }) {
  const t = useI18n("user.page.mcpConsent");

  return (
    <Stack>
      <Alert
        color="red"
        variant="light"
        role="alert"
        icon={<IconExclamationCircle size={18} />}
        title={t("error.server_error.title")}
      >
        <Text size="sm">{t("error.server_error.description")}</Text>
      </Alert>
      <Text size="sm">{t("error.freshStart")}</Text>
      <Group>
        <Button type="button" variant="default" mih={44} onClick={retry}>
          {t("reload")}
        </Button>
        <Button component="a" href="/" variant="subtle" mih={44}>
          {t("returnHome")}
        </Button>
      </Group>
    </Stack>
  );
}
