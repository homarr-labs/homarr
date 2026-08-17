"use client";

import { Alert, Button, Group, Skeleton, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { getIntegrationName } from "@homarr/definitions";
import { createModal, modalSizeForm } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { IntegrationAvatar } from "@homarr/ui";

import { EditIntegrationForm } from "~/app/[locale]/manage/integrations/edit/[id]/_integration-edit-form";

export interface EmbeddedIntegrationEditModalProps {
  integrationId: string;
  onSuccess?: () => void;
}

export const EmbeddedIntegrationEditModal = createModal<EmbeddedIntegrationEditModalProps>(
  ({ actions, innerProps }) => {
    const t = useI18n();
    const {
      data: integration,
      isPending,
      isError,
      refetch,
    } = clientApi.integration.byId.useQuery({
      id: innerProps.integrationId,
    });

    if (isPending) {
      return (
        <Stack gap="sm" aria-busy="true" aria-label={t("item.edit.integration.loading")}>
          <Skeleton height={36} width="60%" />
          <Skeleton height={60} />
          <Skeleton height={120} />
        </Stack>
      );
    }

    if (isError || !integration) {
      return (
        <Alert color="red" title={t("common.error")}>
          <Stack gap="sm">
            <Text size="sm">{t("item.edit.integration.loadError")}</Text>
            <Button variant="light" color="red" onClick={() => void refetch()}>
              {t("common.action.tryAgain")}
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
          {t("item.edit.integration.propagationNotice")}
        </Alert>
        <EditIntegrationForm
          integration={integration}
          embedded
          onSuccess={() => {
            innerProps.onSuccess?.();
            actions.closeModal();
          }}
        />
      </Stack>
    );
  },
).withOptions({
  defaultTitle: (t) => t("item.edit.tab.integration"),
  size: modalSizeForm,
  presentation: "inspector",
  closeOnClickOutside: true,
});
