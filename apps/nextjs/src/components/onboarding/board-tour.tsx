"use client";

import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import type { OnboardingTourStep } from "@gfazioli/mantine-onboarding-tour";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";

import { useBoardPermissions } from "~/components/board/permissions/client";
import { SkipHoldButton } from "./skip-hold-button";
import { TourStepContent } from "./tour-step-content";

export const BoardTourProvider = ({ children }: PropsWithChildren) => {
  const t = useScopedI18n("onboardingTour.board");
  const board = useRequiredBoard();
  const { hasChangeAccess } = useBoardPermissions(board);
  const { data: tourStatus } = clientApi.user.getTourStatus.useQuery();
  const { mutate: completeTour } = clientApi.user.completeTour.useMutation();

  const started = tourStatus !== undefined && !tourStatus.completedBoardTour;

  const handleEnd = () => {
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
            docPath="/docs/getting-started/after-the-installation"
            docHash="#creating-your-first-board"
          />
        ),
        footer: (controller: { skipTour: () => void }) => (
          <SkipHoldButton onSkip={() => controller.skipTour()} />
        ),
      },
      {
        id: "board-edit-mode",
        title: t("editMode.title"),
        requiresChangeAccess: true,
        content: (
          <TourStepContent
            description={t("editMode.description")}
            docPath="/docs/getting-started/after-the-installation"
            docHash="#arrange-and-organize-your-board"
          />
        ),
      },
      {
        id: "board-settings",
        title: t("settings.title"),
        requiresChangeAccess: true,
        content: (
          <TourStepContent description={t("settings.description")} docPath="/docs/management/boards" />
        ),
      },
      {
        id: "board-switcher",
        title: t("switcher.title"),
        content: (
          <TourStepContent description={t("switcher.description")} docPath="/docs/management/boards" />
        ),
      },
      {
        id: "board-user-menu",
        title: t("userMenu.title"),
        content: (
          <TourStepContent description={t("userMenu.description")} docPath="/docs/management/users" />
        ),
      },
    ];

    return allSteps.filter(
      (step) => !step.requiresChangeAccess || hasChangeAccess,
    ) as OnboardingTourStep[];
  }, [hasChangeAccess, t]);

  return (
    <OnboardingTour
      tour={steps}
      started={started}
      onOnboardingTourComplete={handleEnd}
      onOnboardingTourSkip={handleEnd}
      maw={420}
    >
      {children}
    </OnboardingTour>
  );
};
