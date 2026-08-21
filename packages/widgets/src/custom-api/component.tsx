"use client";

import dynamic from "next/dynamic";
import { Button, Center, Loader, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { isLegacyCustomWidgetMigrationError, isTerminalCustomWidgetDefinitionError } from "./migration-state";

const CustomJsxDisplay = dynamic(() => import("./custom-jsx-display"), { ssr: false });

export default function CustomApiWidget({
  options,
  itemId,
  isEditMode,
  removeItem,
}: WidgetComponentProps<"customApi">) {
  const t = useI18n("widget.customApi");
  const tCustomJsx = useI18n("widget.customApi.customJsx");
  const { data: session } = useSession();
  const isAdmin = session?.user.permissions.includes("admin") ?? false;
  const definitionId = options.definitionId;
  const safeInterval = Number.isFinite(options.refreshInterval) ? options.refreshInterval : 30;
  const intervalMs = Math.max(1_000, safeInterval * 1_000);
  const query = clientApi.widget.customApi.getData.useQuery(
    { itemId: itemId ?? "" },
    {
      enabled: Boolean(itemId) && Boolean(definitionId),
      refetchInterval: (currentQuery) =>
        isTerminalCustomWidgetDefinitionError(currentQuery.state.error) ? false : intervalMs,
      retry: (failureCount, error) => !isTerminalCustomWidgetDefinitionError(error) && failureCount < 3,
    },
  );

  if (!definitionId) {
    return <Unavailable message={t("definitionNotFound")} removeLabel={t("removeFromBoard")} onRemove={removeItem} />;
  }
  if (isEditMode && !itemId) return <Unavailable message={t("editModePending")} />;
  if (query.isLoading)
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );
  if (query.error) {
    const errorCode = query.error.data?.code;
    const migrationRequired = isLegacyCustomWidgetMigrationError(query.error);
    if (isEditMode && errorCode === "NOT_FOUND") {
      return <Unavailable message={t("editModePending")} />;
    }
    const isUnavailable = errorCode === "NOT_FOUND" || errorCode === "FORBIDDEN";
    return (
      <Unavailable
        message={
          migrationRequired
            ? t("migrationRequired")
            : isUnavailable
              ? t("definitionNotFound")
              : errorCode === "PRECONDITION_FAILED"
                ? t("configurationNeedsRepair")
                : tCustomJsx("requestFailed")
        }
        danger={!isUnavailable && !migrationRequired}
        removeLabel={isUnavailable ? t("removeFromBoard") : undefined}
        actionLabel={migrationRequired && isAdmin ? t("manageMigration") : undefined}
        actionHref={migrationRequired && isAdmin ? "/manage/custom-widgets" : undefined}
        supplementaryMessage={migrationRequired && !isAdmin ? t("contactAdmin") : undefined}
        onRemove={removeItem}
      />
    );
  }
  if (!query.data) return null;

  return (
    <CustomJsxDisplay
      data={{
        ...query.data,
        widgetDefinitionId: definitionId,
        widgetItemId: itemId,
        isEditMode,
      }}
    />
  );
}
function Unavailable({
  message,
  danger = false,
  removeLabel,
  actionLabel,
  actionHref,
  supplementaryMessage,
  onRemove,
}: {
  message: string;
  danger?: boolean;
  removeLabel?: string;
  actionLabel?: string;
  actionHref?: string;
  supplementaryMessage?: string;
  onRemove?: () => void;
}) {
  return (
    <Center h="100%" p="sm">
      <Stack align="center" gap="xs">
        <IconAlertTriangle size={32} color={`var(--mantine-color-${danger ? "red" : "yellow"}-6)`} />
        <Text c="dimmed" size="sm" ta="center">
          {message}
        </Text>
        {supplementaryMessage && (
          <Text size="sm" fw={600} ta="center">
            {supplementaryMessage}
          </Text>
        )}
        {actionLabel && actionHref && (
          <Button component={Link} href={actionHref} size="compact-sm" color="yellow" variant="light">
            {actionLabel}
          </Button>
        )}
        {removeLabel && onRemove && (
          <Button size="compact-sm" color="red" variant="light" onClick={onRemove}>
            {removeLabel}
          </Button>
        )}
      </Stack>
    </Center>
  );
}
