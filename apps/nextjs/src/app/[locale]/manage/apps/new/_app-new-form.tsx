"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { z } from "zod";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { TranslationFunction } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";
import type { validation } from "@homarr/validation";

import { AppForm } from "../_form";

export const AppNewForm = () => {
  const t = useScopedI18n("app.page.create.notification");
  const router = useRouter();

  const { mutate, isPending } = clientApi.app.create.useMutation({
    onSuccess: () => {
      showSuccessNotification({
        title: t("success.title"),
        message: t("success.message"),
      });
      void revalidatePathActionAsync("/manage/apps").then(() => {
        router.push("/manage/apps");
      });
    },
    onError: () => {
      showErrorNotification({
        title: t("error.title"),
        message: t("error.message"),
      });
    },
  });

  const handleSubmit = useCallback(
    (values: z.infer<typeof validation.app.manage>) => {
      mutate(values);
    },
    [mutate],
  );

  const submitButtonTranslation = useCallback((t: TranslationFunction) => t("common.action.create"), []);

  return (
    <AppForm submitButtonTranslation={submitButtonTranslation} handleSubmit={handleSubmit} isPending={isPending} />
  );
};
