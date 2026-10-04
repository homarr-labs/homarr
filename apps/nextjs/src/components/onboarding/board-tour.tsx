"use client";

import type { PropsWithChildren } from "react";
import { useMemo, useState } from "react";
import type { OnboardingTourStep } from "@gfazioli/mantine-onboarding-tour";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { createDocumentationLink } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { useBoardPermissions } from "~/components/board/permissions/client";
import { TourTargetsProvider } from "~/components/layout/header/tour-target";
import { TourShell } from "./tour-shell";
import { TourStepContent } from "./tour-step-content";

export const BoardTourProvider = ({ children }: PropsWithChildren) => {
  const t = useI18n("onboardingTour.board");
  const board = useRequiredBoard();
  const { hasChangeAccess } = useBoardPermissions(board);
  const [started, setStarted] = useState(true);
  const { mutate: completeTour } = clientApi.user.completeTour.useMutation();

  const handleEnd = () => {
    setStarted(false);
    completeTour({ tour: "board" });
  };

  const steps = useMemo(() => {
    const allSteps: (OnboardingTourStep & { requiresChangeAccess?: boolean })[] = [
      {
        id: "board-search",
        title: t("welcome.title"),
        content: (
          <TourStepContent
            description={t("welcome.description")}
            documentationHref={createDocumentationLink(
              "/docs/getting-started/after-the-installation",
              "#creating-your-first-board",
            )}
          />
        ),
      },
      {
        id: "board-edit-mode",
        title: t("editMode.title"),
        requiresChangeAccess: true,
        content: (
          <TourStepContent
            description={t("editMode.description")}
            documentationHref={createDocumentationLink(
              "/docs/getting-started/after-the-installation",
              "#arrange-and-organize-your-board",
            )}
          />
        ),
      },
      {
        id: "board-settings",
        title: t("settings.title"),
        requiresChangeAccess: true,
        content: (
          <TourStepContent
            description={t("settings.description")}
            documentationHref={createDocumentationLink("/docs/management/boards")}
          />
        ),
      },
      {
        id: "board-user-menu",
        title: t("userMenu.title"),
        content: (
          <TourStepContent
            description={t("userMenu.description")}
            documentationHref={createDocumentationLink("/docs/management/users")}
          />
        ),
      },
    ];

    return allSteps.filter((step) => !step.requiresChangeAccess || hasChangeAccess) as OnboardingTourStep[];
  }, [hasChangeAccess, t]);

  return (
    <TourTargetsProvider enabled={started}>
      <TourShell steps={steps} started={started} onEnd={handleEnd} position={{ base: "bottom", md: "left" }}>
        {children}
      </TourShell>
    </TourTargetsProvider>
  );
};
