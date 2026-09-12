"use client";

import dynamic from "next/dynamic";
import { Button, Center, Loader, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { isRecord } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";
import { Link, zoomCompensatedSize } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import { isLegacyCustomWidgetMigrationError, isTerminalCustomWidgetDefinitionError } from "./migration-state";
import { usePackageLifecycle } from "./use-package-lifecycle";

const CustomJsxDisplay = dynamic(() => import("./custom-jsx-display"), { ssr: false });
const TrustedWidgetDisplay = dynamic(() => import("./trusted-widget-display"), { ssr: false });

export default function CustomApiWidget(props: WidgetComponentProps<"customApi">) {
  const { options, itemId, isEditMode, removeItem } = props;
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
      refetchInterval: (currentQuery) => {
        if (isTerminalCustomWidgetDefinitionError(currentQuery.state.error)) return false;
        const data = currentQuery.state.data;
        if (isRecord(data) && (data.type === "customWidgetV3" || data.hasLoadQueries === false)) return false;
        return intervalMs;
      },
      retry: (failureCount, error) => !isTerminalCustomWidgetDefinitionError(error) && failureCount < 3,
    },
  );
  const accessError = usePackageLifecycle({
    itemId,
    enabled: query.data?.type === "customWidgetV3",
    refresh: query.refetch,
  });

  if (accessError) return <Unavailable message={t("definitionNotFound")} />;
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
  if (query.error && (isTerminalCustomWidgetDefinitionError(query.error) || !query.data)) {
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
  if (query.data.type === "customWidgetV3") {
    return <TrustedWidgetDisplay data={query.data} widget={props} />;
  }

  return (
    <CustomJsxDisplay
      data={{
        ...query.data,
        widgetDefinitionId: definitionId,
        widgetItemId: itemId,
        isEditMode,
        host: {
          boardId: props.boardId,
          itemId,
          width: props.width,
          height: props.height,
          displayScale: props.displayScale ?? 1,
          visibleWidth: props.width * (props.displayScale ?? 1),
          visibleHeight: props.height * (props.displayScale ?? 1),
          displayMode: props.displayMode ?? "compact",
          isEditMode,
          isPreview: !itemId,
        },
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
        <IconAlertTriangle
          style={zoomCompensatedSize(32)}
          color={`var(--mantine-color-${danger ? "red" : "yellow"}-6)`}
        />
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
