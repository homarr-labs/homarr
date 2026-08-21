"use client";

import { useImperativeHandle, useRef } from "react";
import { Alert, Button, Group, Skeleton, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { getIntegrationName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { IntegrationAvatar } from "@homarr/ui";
import type { EmbeddedIntegrationEditFormProps } from "@homarr/widgets/modals";

import type { EditIntegrationFormHandle } from "~/app/[locale]/manage/integrations/edit/[id]/_integration-edit-form";
import { EditIntegrationForm } from "~/app/[locale]/manage/integrations/edit/[id]/_integration-edit-form";

export type { EmbeddedIntegrationEditFormProps } from "@homarr/widgets/modals";

export const EmbeddedIntegrationEditForm = ({
  integrationId,
  handleRef,
  onSuccess,
}: EmbeddedIntegrationEditFormProps) => {
  const tItem = useI18n("item.edit.integration");
  const tCommon = useI18n("common");
  const integrationFormRef = useRef<EditIntegrationFormHandle>(null);
  const {
    data: integration,
    isPending,
    isError,
    refetch,
  } = clientApi.integration.byId.useQuery({
    id: integrationId,
  });

  useImperativeHandle(
    handleRef,
    () => ({
      submitIfDirty: async () => {
        if (!integrationFormRef.current?.isDirty()) {
          return true;
        }

        return integrationFormRef.current.submit();
      },
    }),
    [],
  );

  if (isPending) {
    return (
      <Stack gap="sm" aria-busy="true" aria-label={tItem("loading")}>
        <Skeleton height={36} width="60%" />
        <Skeleton height={60} />
        <Skeleton height={120} />
      </Stack>
    );
  }

  if (isError || !integration) {
    return (
      <Alert color="red" title={tCommon("error")}>
        <Stack gap="sm">
          <Text size="sm">{tItem("loadError")}</Text>
          <Button variant="light" color="red" onClick={() => void refetch()}>
            {tCommon("action.tryAgain")}
          </Button>
        </Stack>
      </Alert>
    );
  }

  return (
    <Stack>
      <Group gap="sm" wrap="nowrap">
        <IntegrationAvatar kind={integration.kind} size="sm" />
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text fw={600} truncate>
            {integration.name}
          </Text>
          <Text size="xs" c="dimmed">
            {getIntegrationName(integration.kind)}
          </Text>
        </Stack>
      </Group>
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
        {tItem("propagationNotice")}
      </Alert>
      <EditIntegrationForm integration={integration} hideButtons formRef={integrationFormRef} onSuccess={onSuccess} />
    </Stack>
  );
};
