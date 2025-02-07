"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { z } from "zod";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import type { validation } from "@homarr/validation";

import { AppForm } from "../../_form";

interface AppEditFormProps {
  app: RouterOutputs["app"]["byId"];
}

export const AppEditForm = ({ app }: AppEditFormProps) => {
  const tScoped = useScopedI18n("app.page.edit.notification");
  const t = useI18n();
  const router = useRouter();

  const { mutate, isPending } = clientApi.app.update.useMutation({
    onSuccess: () => {
      showSuccessNotification({
        title: tScoped("success.title"),
        message: tScoped("success.message"),
      });
      void revalidatePathActionAsync("/manage/apps").then(() => {
        router.push("/manage/apps");
      });
    },
    onError: () => {
      showErrorNotification({
        title: tScoped("error.title"),
        message: tScoped("error.message"),
      });
    },
  });

  const handleSubmit = useCallback(
    (values: z.infer<typeof validation.app.manage>) => {
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
        submit: t("common.action.save"),
      }}
      initialValues={app}
      handleSubmit={handleSubmit}
      isPending={isPending}
    />
  );
};
