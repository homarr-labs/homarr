"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Alert, Badge, Button, Group, Select, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { kubernetesContextCookieName } from "./kubernetes-context.constants";
import { createKubernetesResourceQueryOptions } from "./kubernetes-query-options";

export const KubernetesContextSelector = ({
  initialContexts,
  initialContextId,
}: {
  initialContexts: RouterOutputs["kubernetes"]["contexts"]["getContexts"];
  initialContextId: string | null;
}) => {
  const t = useI18n("kubernetes.context");
  const tCommon = useI18n("common");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, isError, refetch } = clientApi.kubernetes.contexts.getContexts.useQuery(undefined, {
    ...createKubernetesResourceQueryOptions(initialContexts),
    refetchInterval: 30_000,
  });
  const [storedContextId, setStoredContextId] = useState(initialContextId);
  const requestedContextId = searchParams.get("context");
  const contextId =
    data?.contexts.find((context) => context.contextId === requestedContextId)?.contextId ??
    data?.contexts.find((context) => context.contextId === storedContextId)?.contextId ??
    data?.contexts.find((context) => context.contextId === data.defaultContextId)?.contextId ??
    data?.contexts[0]?.contextId ??
    null;
  const context = data?.contexts.find((item) => item.contextId === contextId);

  useEffect(() => {
    if (!contextId) return;
    if (contextId !== storedContextId) {
      setStoredContextId(contextId);
      document.cookie = `${kubernetesContextCookieName}=${encodeURIComponent(contextId)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
  }, [contextId, storedContextId]);

  if (isError) {
    return (
      <Alert color="red" icon={<IconAlertTriangle size={16} />} title={t("loadError.title")}>
        <Stack gap="sm">
          <Text size="sm">{t("loadError.message")}</Text>
          <Button variant="light" color="red" size="xs" w="fit-content" onClick={() => void refetch()}>
            {tCommon("action.tryAgain")}
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (!data || !contextId) return null;

  const selectContext = (value: string | null) => {
    if (!value) return;
    setStoredContextId(value);
    document.cookie = `${kubernetesContextCookieName}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
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

const contextStatusColor = (status: "available" | "degraded" | "unavailable") => {
  if (status === "available") return "green";
  if (status === "degraded") return "yellow";
  return "red";
};
