import { useImperativeHandle, useRef } from "react";
import type { Ref } from "react";
import { Alert, Avatar, Button, Group, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { getIconUrl, getIntegrationName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/standalone/client";

import { IntegrationLoading, IntegrationAccessDenied } from "./feedback";
import { IntegrationForm } from "./form";
import type { IntegrationEditFormHandle } from "./form";
import { useIntegrationFeature, useIntegrationQueryKey } from "./provider";

export interface EmbeddedIntegrationEditHandle {
  submitIfDirty: () => Promise<boolean>;
}

export interface EmbeddedIntegrationEditProps {
  integrationId: string;
  handleRef?: Ref<EmbeddedIntegrationEditHandle>;
  onSuccess?: () => void;
}

export function EmbeddedIntegrationEdit({ integrationId, handleRef, onSuccess }: EmbeddedIntegrationEditProps) {
  const t = useI18n();
  const { client, principal } = useIntegrationFeature();
  const key = useIntegrationQueryKey();
  const formRef = useRef<IntegrationEditFormHandle>(null);
  const query = useQuery({
    queryKey: [...key, "byId", integrationId],
    queryFn: ({ signal }) => client.integration.byId({ id: integrationId }, { signal }),
    enabled: principal.kind === "authenticated",
    retry: false,
    refetchOnWindowFocus: false,
  });
  useImperativeHandle(handleRef, () => ({
    submitIfDirty: async () => {
      if (query.isPending || query.isError || !formRef.current) return false;
      return formRef.current.isDirty() ? formRef.current.submit() : true;
    },
  }));
  if (principal.kind !== "authenticated") return <IntegrationAccessDenied />;
  if (query.isPending) return <IntegrationLoading />;
  if (query.isError)
    return (
      <Alert color="red" title={t("common.error")} role="alert">
        <Stack gap="sm">
          <Text size="sm">{t("item.edit.integration.loadError")}</Text>
          <Button variant="light" color="red" onClick={() => void query.refetch()}>
            {t("common.action.tryAgain")}
          </Button>
        </Stack>
      </Alert>
    );
  return (
    <Stack>
      <Group gap="sm" wrap="nowrap">
        <Avatar src={getIconUrl(query.data.kind)} size="sm" />
        <Stack gap={0} miw={0}>
          <Text fw={600} truncate>
            {query.data.name}
          </Text>
          <Text size="xs" c="dimmed">
            {getIntegrationName(query.data.kind)}
          </Text>
        </Stack>
      </Group>
      <Alert color="blue" variant="light">
        {t("item.edit.integration.propagationNotice")}
      </Alert>
      <IntegrationForm
        key={integrationId}
        mode="edit"
        integration={query.data}
        hideButtons
        formRef={formRef}
        onSaved={onSuccess}
      />
    </Stack>
  );
}
