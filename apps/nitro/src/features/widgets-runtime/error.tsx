import { useState } from "react";
import { Anchor, Button, Stack, Text } from "@mantine/core";
import { ORPCError } from "@orpc/client";

import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import type { WidgetDefinition } from "@homarr/widgets/definition";
import { ErrorBoundaryError } from "@homarr/widgets/errors/classes";

import { isTrpcForbiddenError } from "./query-state";

export function NativeWidgetError({
  error,
  definition,
  onRetry,
  canViewLogs,
}: {
  error: unknown;
  definition?: WidgetDefinition;
  onRetry: () => void;
  canViewLogs: boolean;
}) {
  const t = useI18n();
  const [timestamp] = useState(Date.now);
  const sourceError = error instanceof ErrorBoundaryError ? error.getErrorBoundaryData() : undefined;
  const customError =
    error instanceof ORPCError
      ? Object.entries(definition?.errors ?? {}).find(([code]) => code === error.code)?.[1]
      : undefined;
  const Icon = sourceError?.icon ?? customError?.icon;
  const message = sourceError?.message ?? customError?.message;
  const denied = isTrpcForbiddenError(error);
  const showLogs = !denied && canViewLogs && (sourceError?.showLogsLink ?? !customError?.hideLogsLink);
  return (
    <Stack h="100%" align="center" justify="center" gap="md" p="sm" data-homarr-widget-error role="alert">
      {Icon && <Icon size={40} aria-hidden />}
      <Stack gap={0}>
        <Text ta="center">
          {message
            ? translateIfNecessary(t, message)
            : denied
              ? t("integration.testConnection.error.certificate.alert.permission.title")
              : t("common.error")}
        </Text>
        {showLogs && (
          <Anchor
            href={`/manage/tools/logs?focus=${timestamp}`}
            target="_blank"
            rel="noopener noreferrer"
            ta="center"
            size="sm"
          >
            {t("common.action.checkLogs")}
          </Anchor>
        )}
      </Stack>
      <Button onClick={onRetry} size="sm" variant="light">
        {t("common.action.tryAgain")}
      </Button>
    </Stack>
  );
}
