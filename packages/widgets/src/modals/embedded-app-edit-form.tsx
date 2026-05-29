"use client";

import { useImperativeHandle, useRef } from "react";
import { Alert, Button, Center, Loader, Stack, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { AppFormHandle } from "@homarr/forms-collection";
import { AppForm } from "@homarr/forms-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

export interface EmbeddedAppEditFormHandle {
  submitIfDirty: () => Promise<boolean>;
}

interface EmbeddedAppEditFormProps {
  appId: string;
  handleRef: React.Ref<EmbeddedAppEditFormHandle>;
}

export const EmbeddedAppEditForm = ({ appId, handleRef }: EmbeddedAppEditFormProps) => {
  const t = useI18n();
  const utils = clientApi.useUtils();
  const appFormRef = useRef<AppFormHandle>(null);
  const { data: app, isPending: isLoadingApp, isError, refetch } = clientApi.app.byId.useQuery({ id: appId });

  const { mutateAsync, isPending: isMutating } = clientApi.app.update.useMutation({
    onSuccess: async () => {
      await utils.app.invalidate();
      showSuccessNotification({
        title: t("app.page.edit.notification.success.title"),
        message: t("app.page.edit.notification.success.message"),
      });
    },
    onError: () => {
      showErrorNotification({
        title: t("app.page.edit.notification.error.title"),
        message: t("app.page.edit.notification.error.message"),
      });
    },
  });

  useImperativeHandle(
    handleRef,
    () => ({
      submitIfDirty: async () => {
        if (!appFormRef.current?.isDirty()) {
          return true;
        }

        return appFormRef.current.submit();
      },
    }),
    [],
  );

  if (isLoadingApp) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (isError || !app) {
    return (
      <Stack align="center" gap="md" py="xl">
        <Text c="dimmed">{t("app.action.select.notFound")}</Text>
        <Button variant="light" onClick={() => void refetch()}>
          {t("common.action.tryAgain")}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack>
      <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
        {t("item.edit.app.propagationNotice")}
      </Alert>
      <AppForm
        formRef={appFormRef}
        hideButtons
        showBackToOverview={false}
        buttonLabels={{ submit: "" }}
        initialValues={app}
        handleSubmit={async (values) => {
          await mutateAsync({ id: appId, ...values });
        }}
        isPending={isMutating}
      />
    </Stack>
  );
};
