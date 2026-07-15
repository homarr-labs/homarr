"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Button, Center, Code, Loader, ScrollArea, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconPlayerPlay } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { createCustomWidgetDisplayComponents } from "@homarr/custom-widgets/runtime";

import type { WidgetComponentProps } from "../definition";

const CustomJsxDisplay = dynamic(() => import("./custom-jsx-display"), { ssr: false });

function ActionButtonDisplay({ data }: { data: Record<string, unknown> }) {
  const t = useScopedI18n("widget.customApi");
  const { openConfirmModal } = useConfirmModal();
  const executeMutation = clientApi.widget.customApi.executeBaseAction.useMutation();
  const [lastSuccess, setLastSuccess] = useState(false);

  const buttonLabel = (data.buttonLabel as string) ?? t("execute");
  const buttonColor = (data.buttonColor as string) ?? "blue";
  const confirmText = (data.confirmText as string) || "";
  const requiresConfirmation = data.requiresConfirmation === true;
  const successMessage = (data.successMessage as string) || t("executeSuccess");
  const itemId = data.widgetItemId as string | undefined;
  const isEditMode = data.isEditMode === true;

  const handleExecute = async (confirmed: boolean) => {
    if (!itemId || isEditMode) return;
    setLastSuccess(false);
    try {
      const result = await executeMutation.mutateAsync({ itemId, confirmed });
      if (result.success) {
        setLastSuccess(true);
        showSuccessNotification({ title: buttonLabel, message: successMessage });
        setTimeout(() => setLastSuccess(false), 3000);
      } else {
        showErrorNotification({ title: buttonLabel, message: result.error ?? t("executeFailed") });
      }
    } catch {
      showErrorNotification({ title: buttonLabel, message: t("executeFailed") });
    }
  };

  const handleClick = () => {
    if (confirmText || requiresConfirmation) {
      openConfirmModal({
        title: buttonLabel,
        children: confirmText || t("executeConfirm"),
        onConfirm: () => void handleExecute(true),
      });
    } else {
      void handleExecute(false);
    }
  };

  return (
    <Center h="100%">
      <Button
        size="lg"
        color={buttonColor}
        onClick={handleClick}
        loading={executeMutation.isPending}
        leftSection={lastSuccess ? <IconCheck size={20} /> : <IconPlayerPlay size={20} />}
        variant={lastSuccess ? "light" : "filled"}
        disabled={!itemId || isEditMode}
      >
        {executeMutation.isPending ? t("executing") : buttonLabel}
      </Button>
    </Center>
  );
}

export const createDisplayComponents = (openJsonLabel: string) =>
  createCustomWidgetDisplayComponents({
    actionButton: ActionButtonDisplay,
    customJsx: CustomJsxDisplay,
    openJsonLabel,
  });

export default function CustomApiWidget({ options, itemId, isEditMode }: WidgetComponentProps<"customApi">) {
  const t = useScopedI18n("widget.customApi");
  const { definitionId, refreshInterval } = options;

  if (!definitionId) {
    return (
      <Center h="100%">
        <Stack align="center" gap="xs">
          <IconAlertTriangle size={32} color="var(--mantine-color-yellow-6)" />
          <Text c="dimmed" size="sm">
            {t("noDefinition")}
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <CustomApiWidgetInner
      definitionId={definitionId}
      itemId={itemId}
      isEditMode={isEditMode}
      refreshInterval={refreshInterval as number}
    />
  );
}

function CustomApiWidgetInner({
  definitionId,
  itemId,
  isEditMode,
  refreshInterval,
}: {
  definitionId: string;
  itemId: string | undefined;
  isEditMode: boolean;
  refreshInterval: number;
}) {
  const t = useScopedI18n("widget.customApi");
  const tCustomWidget = useScopedI18n("customWidget");
  const tCustomJsx = useScopedI18n("widget.customApi.customJsx");
  const displayComponents = useMemo(() => createDisplayComponents(t("openJson")), [t]);
  const safeInterval = Number.isFinite(refreshInterval) ? refreshInterval : 30;
  const intervalMs = Math.max(1000, safeInterval * 1000);
  const { data, isLoading, error } = clientApi.widget.customApi.getData.useQuery(
    { itemId: itemId ?? "" },
    {
      enabled: Boolean(itemId),
      refetchInterval: (query) => {
        const result = query.state.data as Record<string, unknown> | undefined;
        if (
          result?.type === "actionButton" ||
          result?.type === "disabled" ||
          result?.type === "networkAccessNeedsReview"
        ) {
          return false;
        }
        return intervalMs;
      },
      retry: (failureCount, err) => {
        if (err.data?.code === "NOT_FOUND") return false;
        return failureCount < 3;
      },
    },
  );

  if (isLoading) {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );
  }

  if (error) {
    const isNotFound = error.data?.code === "NOT_FOUND";
    return (
      <Center h="100%">
        <Stack align="center" gap="xs">
          <IconAlertTriangle size={32} color={`var(--mantine-color-${isNotFound ? "yellow" : "red"}-6)`} />
          <Text c="dimmed" size="sm" ta="center">
            {isNotFound ? t("definitionNotFound") : tCustomJsx("requestFailed")}
          </Text>
        </Stack>
      </Center>
    );
  }

  if (!data) return null;

  const widgetData = data as Record<string, unknown>;
  const dataType = widgetData.type as string | undefined;

  if (dataType === "disabled") {
    return (
      <Center h="100%">
        <Text c="dimmed" size="sm">
          {tCustomWidget("widget.disabled")}
        </Text>
      </Center>
    );
  }

  if (dataType === "networkAccessNeedsReview") {
    return (
      <Center h="100%" p="sm">
        <Stack align="center" gap="xs">
          <IconAlertTriangle size={32} color="var(--mantine-color-yellow-6)" />
          <Text c="dimmed" size="sm" ta="center">
            {tCustomJsx("networkAccessNeedsReview")}
          </Text>
        </Stack>
      </Center>
    );
  }

  const Component = dataType ? displayComponents[dataType] : undefined;
  if (Component) {
    const enrichedData =
      dataType === "actionButton" || dataType === "customJsx"
        ? { ...widgetData, widgetDefinitionId: definitionId, widgetItemId: itemId, isEditMode }
        : widgetData;
    return <Component data={enrichedData} />;
  }

  return (
    <ScrollArea h="100%" p="xs">
      <Code block style={{ fontSize: 11 }}>
        {JSON.stringify(data, null, 2)}
      </Code>
    </ScrollArea>
  );
}
