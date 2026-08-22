"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import type { appManageSchema } from "@homarr/validation/app";

import { AppForm } from "./_form";

export const AppNewForm = ({
  showCreateAnother,
  showBackToOverview,
}: {
  showCreateAnother: boolean;
  showBackToOverview: boolean;
}) => {
  const tScoped = useI18n("app.page.create.notification");
  const tCommon = useI18n("common");
  const router = useRouter();

  const { mutate, isPending } = clientApi.app.create.useMutation({
    onError: () => {
      showErrorNotification({
        title: tCommon("notification.create.error"),
        message: tScoped("error.message"),
      });
    },
  });

  const handleSubmit = useCallback(
    (values: z.infer<typeof appManageSchema>, redirect: boolean, afterSuccess?: () => void) => {
      mutate(values, {
        onSuccess() {
          showSuccessNotification({
            title: tCommon("notification.create.success"),
            message: tScoped("success.message"),
          });
          afterSuccess?.();

          if (!redirect) {
            return;
          }
          void revalidatePathActionAsync("/manage/apps").then(() => {
            router.push("/manage/apps");
          });
        },
      });
    },
    [mutate, router, tCommon, tScoped],
  );

  return (
    <AppForm
      buttonLabels={{
        submit: tCommon("action.create"),
        submitAndCreateAnother: showCreateAnother ? tCommon("action.createAnother") : undefined,
      }}
      showBackToOverview={showBackToOverview}
      handleSubmit={handleSubmit}
      isPending={isPending}
    />
  );
};
