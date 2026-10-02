"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { AppForm } from "@homarr/forms-collection";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { appManageSchema } from "@homarr/validation/app";

interface AppEditFormProps {
  app: RouterOutputs["app"]["byId"];
}

export const AppEditForm = ({ app }: AppEditFormProps) => {
  const tScoped = useI18n("app.page.edit.notification");
  const tCommon = useI18n("common");
  const router = useRouter();

  const { mutate, isPending } = clientApi.app.update.useMutation({
    onSuccess: () => {
      showSuccessNotification({
        title: tCommon("notification.update.success"),
        message: tScoped("success.message"),
      });
      void revalidatePathActionAsync("/manage/apps").then(() => {
        router.push("/manage/apps");
      });
    },
    onError: () => {
      showErrorNotification({
        title: tCommon("notification.update.error"),
        message: tScoped("error.message"),
      });
    },
  });

  const handleSubmit = useCallback(
    (values: z.infer<typeof appManageSchema>) => {
      mutate({
        id: app.id,
        ...values,
      });
    },
    [mutate, app.id],
  );

  return (
    <AppForm
      buttonLabels={{
        submit: tCommon("action.save"),
      }}
      initialValues={app}
      handleSubmit={handleSubmit}
      isPending={isPending}
      showBackToOverview
    />
  );
};
