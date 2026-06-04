"use client";

import type { PropsWithChildren, ReactNode } from "react";
import { Button } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import type { OnboardingStep } from "@homarr/definitions";

import { clearInitImportMode, setInitImportMode, type InitImportMode } from "../import/use-init-import-mode";

interface InitStartButtonProps {
  icon: ReactNode;
  preferredStep: OnboardingStep | undefined;
  importMode?: InitImportMode;
}

export const InitStartButton = ({
  preferredStep,
  icon,
  children,
  importMode,
}: PropsWithChildren<InitStartButtonProps>) => {
  const { mutateAsync } = clientApi.onboard.nextStep.useMutation();

  const handleClickAsync = async () => {
    if (importMode) {
      setInitImportMode(importMode);
    } else {
      clearInitImportMode();
    }
    await mutateAsync({ preferredStep });
    await revalidatePathActionAsync("/init");
  };

  return (
    <Button onClick={handleClickAsync} variant="default" leftSection={icon}>
      {children}
    </Button>
  );
};
