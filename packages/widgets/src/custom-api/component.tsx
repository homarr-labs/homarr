"use client";

import dynamic from "next/dynamic";
import { Button, Center, Loader, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

const CustomJsxDisplay = dynamic(() => import("./custom-jsx-display"), { ssr: false });

export default function CustomApiWidget({
  options,
  itemId,
  isEditMode,
  removeItem,
}: WidgetComponentProps<"customApi">) {
  const t = useScopedI18n("widget.customApi");
  const tCustomJsx = useScopedI18n("widget.customApi.customJsx");
  const definitionId = options.definitionId;
  const safeInterval = Number.isFinite(options.refreshInterval) ? options.refreshInterval : 30;
  const intervalMs = Math.max(1_000, safeInterval * 1_000);
  const query = clientApi.widget.customApi.getData.useQuery(
    { itemId: itemId ?? "" },
    {
      enabled: Boolean(itemId) && Boolean(definitionId),
      refetchInterval: intervalMs,
      retry: (failureCount, error) =>
        !["NOT_FOUND", "PRECONDITION_FAILED"].includes(error.data?.code ?? "") && failureCount < 3,
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
    return (
      <Unavailable
        message={
          errorCode === "NOT_FOUND"
            ? t("definitionNotFound")
            : errorCode === "PRECONDITION_FAILED"
              ? t("configurationNeedsRepair")
              : tCustomJsx("requestFailed")
        }
        danger={errorCode !== "NOT_FOUND"}
        removeLabel={errorCode === "NOT_FOUND" ? t("removeFromBoard") : undefined}
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
  onRemove,
}: {
  message: string;
  danger?: boolean;
  removeLabel?: string;
  onRemove?: () => void;
}) {
  return (
    <Center h="100%" p="sm">
      <Stack align="center" gap="xs">
        <IconAlertTriangle size={32} color={`var(--mantine-color-${danger ? "red" : "yellow"}-6)`} />
        <Text c="dimmed" size="sm" ta="center">
          {message}
        </Text>
        {removeLabel && onRemove && (
          <Button size="compact-sm" color="red" variant="light" onClick={onRemove}>
            {removeLabel}
          </Button>
        )}
      </Stack>
    </Center>
  );
}
