"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, Badge, Button, Group, Select, Stack, Text } from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { IconAlertTriangle } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

export const KubernetesContextSelector = () => {
  const t = useScopedI18n("kubernetes.context");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isError, refetch } = clientApi.kubernetes.contexts.getContexts.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  const [storedContextId, setStoredContextId] = useLocalStorage<string | null>({
    key: "homarr-kubernetes-context",
    defaultValue: null,
  });
  const requestedContextId = searchParams.get("context");
  const contextId =
    data?.contexts.find((context) => context.contextId === requestedContextId)?.contextId ??
    data?.contexts.find((context) => context.contextId === storedContextId)?.contextId ??
    data?.contexts.find((context) => context.contextId === data.defaultContextId)?.contextId ??
    data?.contexts[0]?.contextId ??
    null;
  const context = data?.contexts.find((item) => item.contextId === contextId);

  useEffect(() => {
    if (!contextId || requestedContextId === contextId) return;
    const next = new URLSearchParams(searchParams);
    next.set("context", contextId);
    router.replace(`${pathname}?${next.toString()}`);
  }, [contextId, pathname, requestedContextId, router, searchParams]);

  if (isError) {
    return (
      <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t("loadError.title")}>
        <Stack gap="sm">
          <Text size="sm">{t("loadError.message")}</Text>
          <Button variant="light" color="red" size="xs" w="fit-content" onClick={() => void refetch()}>
            {t("loadError.retry")}
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (!data || !contextId) return null;

  const selectContext = (value: string | null) => {
    if (!value) return;
    setStoredContextId(value);
    const next = new URLSearchParams(searchParams);
    next.set("context", value);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <>
      <Group justify="end">
        <Select
          label={t("label")}
          value={contextId}
          data={data.contexts.map((item) => ({ value: item.contextId, label: item.name }))}
          onChange={selectContext}
          allowDeselect={false}
        />
        {context && (
          <Badge color={contextStatusColor(context.status)} variant="light">
            {t(`status.${context.status}`)}
          </Badge>
        )}
      </Group>
      {context?.status === "unavailable" && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
          {t("unavailable")}
        </Alert>
      )}
      {context?.status === "degraded" && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
          {t("metricsUnavailable")}
        </Alert>
      )}
    </>
  );
};

export const useSelectedKubernetesContextId = () => {
  const searchParams = useSearchParams();
  const { data } = clientApi.kubernetes.contexts.getContexts.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
  const requested = searchParams.get("context");
  if (data?.contexts.some(({ contextId }) => contextId === requested)) return requested;
  return (
    data?.contexts.find(({ contextId }) => contextId === data.defaultContextId)?.contextId ??
    data?.contexts[0]?.contextId
  );
};

const contextStatusColor = (status: "available" | "degraded" | "unavailable") => {
  if (status === "available") return "green";
  if (status === "degraded") return "yellow";
  return "red";
};
