"use client";

import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingTourStep } from "@gfazioli/mantine-onboarding-tour";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import { Box } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import { SkipHoldButton } from "./skip-hold-button";
import { TourForkStep } from "./tour-fork-step";
import { TourStepContent } from "./tour-step-content";

interface ManageTourProviderProps extends PropsWithChildren {
  isAdmin: boolean;
}

export const ManageTourProvider = ({ children, isAdmin }: ManageTourProviderProps) => {
  const router = useRouter();
  const t = useScopedI18n("onboardingTour.manage");
  const { data: tourStatus } = clientApi.user.getTourStatus.useQuery();
  const { mutate: completeTour } = clientApi.user.completeTour.useMutation();

  const started = tourStatus !== undefined && !tourStatus.completedManageTour;

  const handleEnd = () => {
    completeTour({ tour: "manage" });
  };

  const steps = useMemo(() => {
    const allSteps: (OnboardingTourStep & { adminOnly?: boolean })[] = [
      {
        id: "manage-welcome",
        title: t("welcome.title"),
        content: (
          <TourStepContent description={t("welcome.description")} docPath="/docs/category/management" />
        ),
        footer: (controller: { skipTour: () => void }) => (
          <SkipHoldButton onSkip={() => controller.skipTour()} />
        ),
      },
      {
        id: "manage-boards",
        title: t("boards.title"),
        content: (
          <TourStepContent description={t("boards.description")} docPath="/docs/management/boards" />
        ),
      },
      {
        id: "manage-apps",
        title: t("apps.title"),
        content: (
          <TourStepContent description={t("apps.description")} docPath="/docs/management/apps" />
        ),
      },
      {
        id: "manage-integrations",
        title: t("integrations.title"),
        content: (controller: { endTour: () => void; nextStep: () => void }) => (
          <TourForkStep
            question={t("integrationsFork.question")}
            description={t("integrations.description")}
            docPath="/docs/management/integrations"
            onYes={() => {
              controller.endTour();
              router.push("/manage/integrations/new");
            }}
            onNo={() => controller.nextStep()}
          />
        ),
      },
      {
        id: "manage-search-engines",
        title: t("searchEngines.title"),
        content: (
          <TourStepContent description={t("searchEngines.description")} docPath="/docs/management/search-engines" />
        ),
      },
      {
        id: "manage-medias",
        title: t("medias.title"),
        content: (
          <TourStepContent description={t("medias.description")} docPath="/docs/management/media" />
        ),
      },
      {
        id: "manage-users",
        title: t("users.title"),
        adminOnly: true,
        content: (controller: { endTour: () => void; nextStep: () => void }) => (
          <TourForkStep
            question={t("usersFork.question")}
            description={t("users.description")}
            docPath="/docs/management/users"
            onYes={() => {
              controller.endTour();
              router.push("/manage/users/create");
            }}
            onNo={() => controller.nextStep()}
          />
        ),
      },
      {
        id: "manage-settings",
        title: t("settings.title"),
        adminOnly: true,
        content: (
          <TourStepContent description={t("settings.description")} docPath="/docs/management/settings" />
        ),
      },
      {
        id: "manage-complete",
        title: t("complete.title"),
        content: (
          <TourStepContent
            description={t("complete.description")}
            docPath="/docs/getting-started/after-the-installation"
          />
        ),
      },
    ];

    return allSteps.filter((step) => !step.adminOnly || isAdmin) as OnboardingTourStep[];
  }, [isAdmin, router, t]);

  return (
    <OnboardingTour
      tour={steps}
      started={started}
      onOnboardingTourComplete={handleEnd}
      onOnboardingTourSkip={handleEnd}
      maw={420}
    >
      <Box
        data-onboarding-tour-id="manage-complete"
        style={{ position: "fixed", opacity: 0, pointerEvents: "none" }}
      />
      {children}
    </OnboardingTour>
  );
};
