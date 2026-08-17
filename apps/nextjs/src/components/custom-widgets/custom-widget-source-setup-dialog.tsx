"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Center, Group, Loader, Modal, Stack, Text } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { getCustomWidgetSourceSetups } from "@homarr/custom-widgets/core";
import type { CustomWidgetSecretKind } from "@homarr/custom-widgets/core";
import {
  createCustomWidgetSourceSetupValues,
  CustomWidgetSourceSetupPanel,
  isCustomWidgetSourceSetupReady,
} from "@homarr/custom-widgets/workbench";
import type {
  CustomWidgetSourceSetupMessages,
  CustomWidgetSourceSetupValue,
} from "@homarr/custom-widgets/workbench";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

interface CustomWidgetSourceSetupDialogProps {
  definitionId: string;
  opened: boolean;
  onClose(): void;
}

export function CustomWidgetSourceSetupDialog({
  definitionId,
  opened,
  onClose,
}: CustomWidgetSourceSetupDialogProps) {
  const t = useScopedI18n("customWidget");
  const router = useRouter();
  const utils = clientApi.useUtils();
  const definitionQuery = clientApi.customWidget.get.useQuery({ id: definitionId }, { enabled: opened });
  const configureMutation = clientApi.customWidget.sourceConfigure.useMutation();
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, CustomWidgetSourceSetupValue>>({});
  const setups = useMemo(
    () => getCustomWidgetSourceSetups(definitionQuery.data?.sources ?? {}, definitionQuery.data?.secrets ?? []),
    [definitionQuery.data],
  );

  useEffect(() => {
    if (opened && definitionQuery.data) setValues(createCustomWidgetSourceSetupValues(setups));
  }, [definitionQuery.data, opened, setups]);

  const messages: CustomWidgetSourceSetupMessages = {
    title: t("importReview.sourceSetup.title"),
    description: t("sourceSetupDialog.description"),
    suggestedUrl: t("importReview.sourceSetup.suggestedUrl"),
    baseUrl: t("workbench.sources.baseUrl"),
    networkScope: t("workbench.sources.networkScope"),
    authentication: t("workbench.sources.authentication"),
    confirmUrl: t("importReview.sourceSetup.confirmUrl"),
    ready: t("importReview.sourceSetup.ready"),
    needsUrl: t("importReview.sourceSetup.needsUrl"),
    credentialsMissing: t("importReview.sourceSetup.credentialsMissing"),
    credentialsOptional: t("sourceSetupDialog.credentialsRequired"),
    configured: t("workbench.sources.configured"),
    secret: (kind) => t(`importReview.credentials.field.${kind}`),
    urlError: (issue) => t(`workbench.sources.baseUrlError.${issue}`),
  };

  const save = async () => {
    if (!isCustomWidgetSourceSetupReady(setups, values) || saving) return;
    setSaving(true);
    try {
      for (const setup of setups) {
        const value = values[setup.sourceId];
        if (!value) continue;
        const secrets = Object.entries(value.secrets).flatMap(([kind, secret]) =>
          secret?.trim() ? [{ sourceId: setup.sourceId, kind: kind as CustomWidgetSecretKind, value: secret }] : [],
        );
        await configureMutation.mutateAsync({
          definitionId,
          sourceId: setup.sourceId,
          baseUrl: value.baseUrl,
          networkScope: value.networkScope,
          secrets,
        });
      }
      showSuccessNotification({
        title: t("action.configureSources"),
        message: t("notification.sourcesConfigured"),
      });
      await utils.customWidget.get.invalidate({ id: definitionId });
      await utils.customWidget.list.invalidate();
      await utils.customWidget.available.invalidate();
      await utils.widget.customApi.getData.invalidate();
      await revalidatePathActionAsync("/manage/custom-widgets");
      router.refresh();
      onClose();
    } catch (error) {
      showErrorNotification({
        title: t("action.configureSources"),
        message: error instanceof Error ? error.message : t("notification.sourceConfigurationError"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t("sourceSetupDialog.title")} size="lg">
      {definitionQuery.isPending ? (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      ) : definitionQuery.error ? (
        <Text c="red" size="sm">
          {definitionQuery.error.message}
        </Text>
      ) : (
        <Stack gap="md">
          <CustomWidgetSourceSetupPanel
            setups={setups}
            values={values}
            messages={messages}
            onChange={(sourceId, value) => setValues((current) => ({ ...current, [sourceId]: value }))}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={saving}>
              {t("sourceSetupDialog.cancel")}
            </Button>
            <Button
              onClick={() => void save()}
              loading={saving}
              disabled={!isCustomWidgetSourceSetupReady(setups, values)}
            >
              {t("sourceSetupDialog.save")}
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
