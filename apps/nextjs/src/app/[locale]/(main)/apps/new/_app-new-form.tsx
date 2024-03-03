"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { clientApi } from "@homarr/api/client";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import type { validation, z } from "@homarr/validation";

import { revalidatePathAction } from "~/app/revalidatePathAction";
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
      void revalidatePathAction("/apps").then(() => {
        router.push("/apps");
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

  return (
    <AppForm
      action="create"
      handleSubmit={handleSubmit}
      isPending={isPending}
    />
  );
};
