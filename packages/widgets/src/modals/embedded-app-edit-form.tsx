"use client";

import { useImperativeHandle, useRef } from "react";
import { Alert, Center, Loader, Stack } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import type { AppFormHandle } from "@homarr/forms-collection";
import { AppForm } from "@homarr/forms-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

export interface EmbeddedAppEditFormHandle {
  submitIfDirty: () => void;
}

interface EmbeddedAppEditFormProps {
  appId: string;
  handleRef: React.Ref<EmbeddedAppEditFormHandle>;
}

export const EmbeddedAppEditForm = ({ appId, handleRef }: EmbeddedAppEditFormProps) => {
  const t = useI18n();
  const appFormRef = useRef<AppFormHandle>(null);
  const { data: app, isPending: isLoadingApp } = clientApi.app.byId.useQuery({ id: appId });

  const { mutate, isPending: isMutating } = clientApi.app.update.useMutation({
    onSuccess: () => {
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
      submitIfDirty: () => {
        if (appFormRef.current?.isDirty()) {
          appFormRef.current.submit();
        }
      },
    }),
    [],
  );

  if (isLoadingApp || !app) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
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
        handleSubmit={(values) => {
          mutate({ id: appId, ...values });
        }}
        isPending={isMutating}
      />
    </Stack>
  );
};
