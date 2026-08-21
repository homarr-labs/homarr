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
  const tCommon = useI18n("common");
  const tAppEdit = useI18n("app.page.edit");
  const tAppSelect = useI18n("app.action.select");
  const tItemApp = useI18n("item.edit.app");
  const utils = clientApi.useUtils();
  const appFormRef = useRef<AppFormHandle>(null);
  const { data: app, isPending: isLoadingApp, isError, refetch } = clientApi.app.byId.useQuery({ id: appId });

  const { mutateAsync, isPending: isMutating } = clientApi.app.update.useMutation({
    onSuccess: async () => {
      await utils.app.invalidate();
      showSuccessNotification({
        title: tCommon("notification.update.success"),
        message: tAppEdit("notification.success.message"),
      });
    },
    onError: () => {
      showErrorNotification({
        title: tCommon("notification.update.error"),
        message: tAppEdit("notification.error.message"),
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
        <Text c="dimmed">{tAppSelect("notFound")}</Text>
        <Button variant="light" onClick={() => void refetch()}>
          {tCommon("action.tryAgain")}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack>
      <Alert icon={<IconInfoCircle size="var(--mantine-font-size-md)" />} color="blue" variant="light">
        {tItemApp("propagationNotice")}
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
