import { Alert, Button, Stack, Text } from "@mantine/core";
import { IconExclamationCircle } from "@tabler/icons-react";

import { getI18n } from "@homarr/translation/server";

import type { McpConsentNativeErrorReason, McpConsentResult } from "~/app/api/mcp/oauth/_grant";

type ConsentProblemReason =
  | Exclude<Extract<McpConsentResult, { ok: false }>["error"], "login_required">
  | McpConsentNativeErrorReason
  | "unknown";

export const ConsentProblem = async ({ reason }: { reason: ConsentProblemReason }) => {
  const t = await getI18n("user.page.mcpConsent");

  return (
    <Stack>
      <Alert
        role="alert"
        color="red"
        variant="light"
        icon={<IconExclamationCircle size={18} />}
        title={t(`error.${reason}.title`)}
      >
        <Text size="sm">{t(`error.${reason}.description`)}</Text>
      </Alert>
      <Text size="sm">{t("error.freshStart")}</Text>
      <Button component="a" href="/" variant="default" mih={44}>
        {t("returnHome")}
      </Button>
    </Stack>
  );
};
