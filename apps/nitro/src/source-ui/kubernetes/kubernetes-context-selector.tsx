import { Alert, Badge, Button, Group, Select, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import type { KubernetesContextsMetadata } from "./contracts";

export interface KubernetesContextSelectorProps {
  data?: KubernetesContextsMetadata;
  contextId?: string;
  error?: boolean;
  retrying?: boolean;
  onContextChange(contextId: string): void;
  onRetry?(): void;
}

export function KubernetesContextSelector(props: KubernetesContextSelectorProps) {
  const t = useI18n("kubernetes.context");
  const tCommon = useI18n("common");
  if (props.error) {
    return (
      <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t("loadError.title")}>
        <Stack gap="sm">
          <Text size="sm">{t("loadError.message")}</Text>
          <Button
            variant="light"
            color="red"
            size="xs"
            w="fit-content"
            disabled={!props.onRetry}
            loading={props.retrying}
            onClick={props.onRetry}
          >
            {tCommon("action.tryAgain")}
          </Button>
        </Stack>
      </Alert>
    );
  }
  const context = props.data?.contexts.find((item) => item.contextId === props.contextId);
  if (!props.data || !context) return null;
  return (
    <>
      <Group justify="end">
        <Select
          label={t("label")}
          value={context.contextId}
          data={props.data.contexts.map((item) => ({ value: item.contextId, label: item.name }))}
          onChange={(value) => {
            if (value && props.data?.contexts.some((item) => item.contextId === value)) props.onContextChange(value);
          }}
          allowDeselect={false}
        />
        <Badge color={contextStatusColor(context.status)} variant="light">
          {t(`status.${context.status}`)}
        </Badge>
      </Group>
      {context.status === "unavailable" && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
          {t("unavailable")}
        </Alert>
      )}
      {context.status === "degraded" && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
          {t("metricsUnavailable")}
        </Alert>
      )}
    </>
  );
}

function contextStatusColor(status: "available" | "degraded" | "unavailable") {
  if (status === "available") return "green";
  if (status === "degraded") return "yellow";
  return "red";
}
