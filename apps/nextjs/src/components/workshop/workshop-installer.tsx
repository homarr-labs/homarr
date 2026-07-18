"use client";

import { useRouter } from "next/navigation";

import { clientApi } from "@homarr/api/client";
import { customWidgetImportSchema } from "@homarr/custom-widgets/core";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import type { WorkshopSubmissionDetail } from "@homarr/workshop";

import { WorkshopBrowser } from "./workshop-browser";

export function WorkshopInstaller() {
  const t = useScopedI18n("workshop");
  const router = useRouter();
  const utils = clientApi.useUtils();
  const importMutation = clientApi.customWidget.import.useMutation();

  const install = async (submission: WorkshopSubmissionDetail) => {
    try {
      const widget = customWidgetImportSchema.parse(JSON.parse(submission.content) as unknown);
      const result = await importMutation.mutateAsync(widget);
      await utils.customWidget.list.invalidate();
      showSuccessNotification({ title: t("installSuccess"), message: t("installSuccessDescription") });
      router.push(`/manage/custom-widgets/edit/${result.id}`);
    } catch (error) {
      showErrorNotification({
        title: t("installError"),
        message: error instanceof Error ? error.message : t("installErrorDescription"),
      });
      throw error;
    }
  };

  return <WorkshopBrowser onInstall={install} />;
}
