"use client";

import { Button } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useI18n } from "@homarr/translation/client";

import { clearInitImportMode } from "./import/use-init-import-mode";

export const BackToStart = () => {
  const t = useI18n();
  const { mutateAsync, isPending } = clientApi.onboard.previousStep.useMutation();

  const handleBackToStartAsync = async () => {
    clearInitImportMode();
    await mutateAsync();
    await revalidatePathActionAsync("/init");
  };

  return (
    <Button loading={isPending} variant="subtle" color="gray" fullWidth onClick={handleBackToStartAsync}>
      {t("init.backToStart")}
    </Button>
  );
};
