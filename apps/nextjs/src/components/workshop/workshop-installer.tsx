"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDisclosure } from "@mantine/hooks";

import { customWidgetImportSchema } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { showErrorNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import type { WorkshopSubmissionDetail } from "@homarr/workshop";

import { CustomWidgetImportDialog } from "~/components/custom-widgets/custom-widget-import-dialog";
import { WorkshopBrowser } from "./workshop-browser";

export function WorkshopInstaller() {
  const t = useScopedI18n("workshop");
  const router = useRouter();
  const [pendingWidget, setPendingWidget] = useState<HomarrCustomWidgetV2 | null>(null);
  const [reviewOpened, reviewControls] = useDisclosure(false);

  const install = async (submission: WorkshopSubmissionDetail) => {
    try {
      const parsed = customWidgetImportSchema.safeParse(JSON.parse(submission.content) as unknown);
      if (!parsed.success) throw new Error(t("installErrorDescription"));
      setPendingWidget(parsed.data);
      reviewControls.open();
    } catch (error) {
      showErrorNotification({
        title: t("installError"),
        message:
          error instanceof SyntaxError
            ? t("installErrorDescription")
            : error instanceof Error
              ? error.message
              : t("installErrorDescription"),
      });
    }
  };

  return (
    <>
      <WorkshopBrowser onInstall={install} />
      <CustomWidgetImportDialog
        opened={reviewOpened}
        widget={pendingWidget}
        onClose={() => {
          reviewControls.close();
          setPendingWidget(null);
        }}
        onImported={(result) => router.push(`/manage/custom-widgets/edit/${result.id}`)}
      />
    </>
  );
}
