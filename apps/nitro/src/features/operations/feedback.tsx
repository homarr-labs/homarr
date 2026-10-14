import { Alert, Button, Skeleton, Stack, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/standalone/client";

export function OperationsAccessDenied() {
  const t = useI18n();
  return (
    <Alert color="red" title={t("integration.testConnection.notification.forbidden.title")} role="alert">
      {t("integration.testConnection.notification.forbidden.message")}
    </Alert>
  );
}

export function OperationsLoading() {
  return (
    <Stack aria-busy="true">
      <Skeleton height={40} />
      <Skeleton height={80} />
      <Skeleton height={80} />
    </Stack>
  );
}

export function OperationsFailure({ message, retry }: { message: string; retry?: () => void }) {
  const t = useI18n();
  return (
    <Alert color="red" title={t("common.error")} role="alert">
      <Stack gap="sm">
        <Text size="sm">{message}</Text>
        {retry && (
          <Button variant="light" color="red" onClick={retry}>
            {t("common.action.tryAgain")}
          </Button>
        )}
      </Stack>
    </Alert>
  );
}
