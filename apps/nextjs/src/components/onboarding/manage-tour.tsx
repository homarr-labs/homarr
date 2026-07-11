"use client";

import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { OnboardingTourFocusRevealProps, OnboardingTourStep } from "@gfazioli/mantine-onboarding-tour";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconAffiliateFilled,
  IconAppsFilled,
  IconLayoutDashboardFilled,
  IconPlus,
  IconUserFilled,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { createDocumentationLink } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";

import { TourShell } from "./tour-shell";
import { TourStepContent } from "./tour-step-content";

interface ManageTourProviderProps extends PropsWithChildren {
  isAdmin: boolean;
}

const stepRoutes: Record<string, string> = {
  "manage-welcome": "/manage",
  "manage-boards-list": "/manage/boards",
  "manage-boards-create": "/manage/boards",
  "manage-apps-list": "/manage/apps",
  "manage-apps-create": "/manage/apps",
  "manage-integrations-list": "/manage/integrations",
  "manage-integrations-create": "/manage/integrations",
  "manage-users-list": "/manage/users",
  "manage-users-create": "/manage/users",
};

const usersStepFocusRevealProps: OnboardingTourFocusRevealProps = {
  withReveal: false,
  popoverProps: {
    position: "bottom",
    middlewares: { shift: { padding: 16 }, flip: true },
  },
};

export const ManageTourProvider = ({ children, isAdmin }: ManageTourProviderProps) => {
  const t = useScopedI18n("onboardingTour.manage");
  const utils = clientApi.useUtils();
  const { data: tourStatus } = clientApi.user.getTourStatus.useQuery();
  const { mutate: completeTour } = clientApi.user.completeTour.useMutation({
    onSuccess() {
      void utils.user.getTourStatus.invalidate();
    },
  });
  const isMobile = useMediaQuery("(max-width: 48em)");
  const pathname = usePathname();
  const router = useRouter();

  const isManageHome = /^(\/[^/]+)?\/manage\/?$/.test(pathname);
  const isManageSection = /^(\/[^/]+)?\/manage(\/.*)?$/.test(pathname);

  const [tourActive, setTourActive] = useState(false);
  const [tourDismissed, setTourDismissed] = useState(false);
  const wasManageTourCompletedRef = useRef(tourStatus?.completedManageTour);

  useEffect(() => {
    if (tourDismissed) return;
    if (isManageHome && tourStatus !== undefined && !tourStatus.completedManageTour && !isMobile) {
      setTourActive(true);
    }
  }, [isManageHome, tourStatus, isMobile, tourDismissed]);

  useEffect(() => {
    if (!isManageSection) {
      setTourActive(false);
    }
  }, [isManageSection]);

  useEffect(() => {
    const wasCompleted = wasManageTourCompletedRef.current;
    const isCompleted = tourStatus?.completedManageTour;
    if (wasCompleted === true && isCompleted === false) {
      setTourDismissed(false);
    }
    wasManageTourCompletedRef.current = isCompleted;
  }, [tourStatus?.completedManageTour]);

  const handleEnd = useCallback(() => {
    setTourDismissed(true);
    setTourActive(false);
    utils.user.getTourStatus.setData(undefined, {
      completedManageTour: true,
      completedBoardTour: tourStatus?.completedBoardTour ?? false,
    });
    completeTour({ tour: "manage" });
    router.push("/manage");
  }, [completeTour, router, tourStatus?.completedBoardTour, utils.user.getTourStatus]);

  const steps = useMemo(() => {
    const allSteps: (OnboardingTourStep & { adminOnly?: boolean })[] = [
      {
        id: "manage-welcome",
        title: t("welcome.title"),
        content: (
          <TourStepContent
            description={t("welcome.description")}
            documentationHref={createDocumentationLink("/docs/management/boards")}
          />
        ),
      },
      {
        id: "manage-boards-list",
        title: t("boardsList.title"),
        content: (
          <TourStepContent
            description={t("boardsList.description")}
            documentationHref={createDocumentationLink("/docs/management/boards")}
            icon={<IconLayoutDashboardFilled size={18} />}
          />
        ),
      },
      {
        id: "manage-boards-create",
        title: t("boardsCreate.title"),
        content: (
          <TourStepContent
            description={t("boardsCreate.description")}
            documentationHref={createDocumentationLink("/docs/management/boards")}
            icon={<IconPlus size={18} />}
          />
        ),
      },
      {
        id: "manage-apps-list",
        title: t("appsList.title"),
        content: (
          <TourStepContent
            description={t("appsList.description")}
            documentationHref={createDocumentationLink("/docs/management/apps")}
            icon={<IconAppsFilled size={18} />}
          />
        ),
      },
      {
        id: "manage-apps-create",
        title: t("appsCreate.title"),
        content: (
          <TourStepContent
            description={t("appsCreate.description")}
            documentationHref={createDocumentationLink("/docs/management/apps")}
            icon={<IconPlus size={18} />}
          />
        ),
      },
      {
        id: "manage-integrations-list",
        title: t("integrationsList.title"),
        content: (
          <TourStepContent
            description={t("integrationsList.description")}
            documentationHref={createDocumentationLink("/docs/management/integrations")}
            icon={<IconAffiliateFilled size={18} />}
          />
        ),
      },
      {
        id: "manage-integrations-create",
        title: t("integrationsCreate.title"),
        content: (
          <TourStepContent
            description={t("integrationsCreate.description")}
            documentationHref={createDocumentationLink("/docs/management/integrations")}
            icon={<IconPlus size={18} />}
          />
        ),
      },
      {
        id: "manage-users-list",
        title: t("usersList.title"),
        adminOnly: true,
        focusRevealProps: usersStepFocusRevealProps,
        content: (
          <TourStepContent
            description={t("usersList.description")}
            documentationHref={createDocumentationLink("/docs/management/users")}
            icon={<IconUserFilled size={18} />}
          />
        ),
      },
      {
        id: "manage-users-create",
        title: t("usersCreate.title"),
        adminOnly: true,
        focusRevealProps: usersStepFocusRevealProps,
        content: (
          <TourStepContent
            description={t("usersCreate.description")}
            documentationHref={createDocumentationLink("/docs/management/users")}
            icon={<IconPlus size={18} />}
          />
        ),
      },
    ];

    return allSteps.filter((step) => !step.adminOnly || isAdmin) as OnboardingTourStep[];
  }, [isAdmin, t]);

  return (
    <TourShell
      steps={steps}
      started={tourActive}
      onEnd={handleEnd}
      stepRoutes={stepRoutes}
      position={{ base: "bottom", sm: "right" }}
    >
      {children}
    </TourShell>
  );
};
