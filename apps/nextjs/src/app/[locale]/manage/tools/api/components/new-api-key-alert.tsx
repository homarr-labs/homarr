"use client";

import { Alert, Button, CopyButton, PasswordInput, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconCopy } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

interface NewApiKeyAlertProps {
  apiKey: string;
  onDismiss: () => void | Promise<void>;
}

export const NewApiKeyAlert = ({ apiKey, onDismiss }: NewApiKeyAlertProps) => {
  const t = useI18n("management.page.tool.api.modal.createApiToken");
  const tCommon = useI18n("common");
  const [visible, { toggle }] = useDisclosure(false);

  return (
    <Alert color="yellow" title={t("title")}>
      <Stack gap="sm">
        <Text size="sm">{t("description")}</Text>
        <PasswordInput value={apiKey} visible={visible} onVisibilityChange={toggle} aria-label={t("title")} readOnly />
        <Stack gap="xs" align="stretch">
          <CopyButton value={apiKey} timeout={2_000}>
            {({ copied, copy }) => {
              let color: "green" | undefined;
              let icon = <IconCopy size={16} />;
              let label = tCommon("action.copy");
              if (copied) {
                color = "green";
                icon = <IconCheck size={16} />;
                label = tCommon("action.copied");
              }

              return (
                <Button onClick={copy} variant="default" color={color} leftSection={icon}>
                  {label}
                </Button>
              );
            }}
          </CopyButton>
          <Button onClick={onDismiss} variant="subtle">
            {tCommon("action.close")}
          </Button>
        </Stack>
      </Stack>
    </Alert>
  );
};
