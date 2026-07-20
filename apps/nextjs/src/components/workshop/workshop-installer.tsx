"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDisclosure } from "@mantine/hooks";

import { customWidgetImportSchema } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import type { WorkshopSubmissionDetail } from "@homarr/workshop";

import { CustomWidgetImportDialog } from "~/components/custom-widgets/custom-widget-import-dialog";
import { WorkshopBrowser } from "./workshop-browser";

export function WorkshopInstaller() {
  const router = useRouter();
  const [pendingWidget, setPendingWidget] = useState<HomarrCustomWidgetV2 | null>(null);
  const [reviewOpened, reviewControls] = useDisclosure(false);

  const install = async (submission: WorkshopSubmissionDetail) => {
    const widget = customWidgetImportSchema.parse(JSON.parse(submission.content) as unknown);
    setPendingWidget(widget);
    reviewControls.open();
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
