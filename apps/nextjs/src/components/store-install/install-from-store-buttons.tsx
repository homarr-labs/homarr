"use client";

import { useState } from "react";
import { Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBuildingStore } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { customWidgetImportSchema } from "@homarr/validation/custom-widget";

import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { StoreBrowserModal } from "./store-browser-modal";

function parseWidgetContent(content: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false as const, message: "Submission content is not valid JSON" };
  }
  const result = customWidgetImportSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false as const, message: result.error.issues[0]?.message ?? "Invalid widget schema" };
  }
  return { ok: true as const, data: result.data };
}

export const InstallWidgetFromStoreButton = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const utils = clientApi.useUtils();
  const importMutation = clientApi.customWidget.import.useMutation({
    onSuccess: () => {
      showSuccessNotification({ title: "Workshop", message: "Custom widget installed" });
      void utils.customWidget.all.invalidate();
      void revalidatePathActionAsync("/manage/custom-widgets");
      setPendingId(null);
      close();
    },
    onError: (err) => {
      showErrorNotification({ title: "Workshop", message: err.message || "Failed to install the custom widget" });
      setPendingId(null);
    },
  });

  const handleSelect = (submission: { id: string; content: string }) => {
    const parsed = parseWidgetContent(submission.content);
    if (!parsed.ok) {
      showErrorNotification({ title: "Workshop", message: parsed.message });
      return;
    }
    setPendingId(submission.id);
    importMutation.mutate(parsed.data);
  };

  return (
    <>
      <MobileAffixButton variant="default" leftSection={<IconBuildingStore size={16} />} onClick={open}>
        Install from Workshop
      </MobileAffixButton>
      <StoreBrowserModal
        type="widget"
        opened={opened}
        onClose={close}
        actionLabel="Install"
        pendingId={pendingId}
        onSelect={handleSelect}
      />
    </>
  );
};

export const InstallCssFromStoreButton = ({ onSelect }: { onSelect: (css: string) => void }) => {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Button variant="default" leftSection={<IconBuildingStore size={16} />} onClick={open}>
        Install from Workshop
      </Button>
      <StoreBrowserModal
        type="css"
        opened={opened}
        onClose={close}
        actionLabel="Use"
        onSelect={(submission) => {
          onSelect(submission.content);
          close();
        }}
      />
    </>
  );
};
