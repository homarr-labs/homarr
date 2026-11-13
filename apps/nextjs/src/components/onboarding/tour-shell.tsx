"use client";

import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { OnboardingTourController, OnboardingTourStep } from "@gfazioli/mantine-onboarding-tour";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import { Button, Center, Group, Image, Kbd, Text } from "@mantine/core";
import type { FloatingPosition } from "@mantine/core";

import { useSettings } from "@homarr/settings";
import { useCurrentLocale, useI18n } from "@homarr/translation/client";

interface TourShellProps extends PropsWithChildren {
  steps: OnboardingTourStep[];
  started: boolean;
  resumeOnPause?: boolean;
  onEnd: () => void;
  stepRoutes?: Record<string, string>;
  position?: FloatingPosition | Record<string, FloatingPosition>;
}

type TourController = OnboardingTourController;

const stepIndexFromController = (controller: TourController) => controller.currentStepIndex ?? 0;

const stepAtOffset = (controller: TourController, offset: number) => {
  const index = stepIndexFromController(controller) + offset;
  return controller.tour[index];
};

const waitForTourTarget = (targetId: string, callback: () => void, onTimeout: () => void) => {
  let stopped = false;
  const stop = () => {
    stopped = true;
    observer.disconnect();
    clearTimeout(timeout);
  };
  const checkForTarget = () => {
    if (stopped) return;
    if (!document.querySelector(`[data-tour-target="${targetId}"]`)) return;
    stop();
    callback();
  };
  const observer = new MutationObserver(checkForTarget);
  const timeout = setTimeout(() => {
    if (stopped) return;
    stop();
    onTimeout();
  }, 5000);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-tour-target"],
  });
  checkForTarget();
  return stop;
};

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
};

interface TourForwardButtonProps {
  label: string;
  onClick: () => void;
}

const TourForwardButton = ({ label, onClick }: TourForwardButtonProps) => {
  return (
    <Button size="sm" variant="light" onClick={onClick} rightSection={<Kbd size="xs">↵</Kbd>}>
      {label}
    </Button>
  );
};

interface TourDoneButtonProps {
  label: string;
  onClick: () => void;
}

const TourDoneButton = ({ label, onClick }: TourDoneButtonProps) => {
  return (
    <Button size="sm" onClick={onClick} rightSection={<Kbd size="xs">↵</Kbd>}>
      {label}
    </Button>
  );
};

export const TourShell = ({
  steps,
  started,
  resumeOnPause = false,
  onEnd,
  stepRoutes,
  position,
  children,
}: TourShellProps) => {
  const tCommon = useI18n("common.action");
  const tTour = useI18n("onboardingTour");
  const { branding } = useSettings();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useCurrentLocale();
  let currentRoute = pathname;
  const localePrefix = `/${locale}/`;
  if (currentRoute.startsWith(localePrefix)) {
    currentRoute = currentRoute.slice(localePrefix.length - 1);
  }
  currentRoute = currentRoute.replace(/\/$/, "");

  const forwardActionRef = useRef<(() => void) | null>(null);
  const pendingTargetCleanupRef = useRef<(() => void) | null>(null);
  const controllerRef = useRef<TourController | null>(null);
  const pendingResumeIndexRef = useRef<number | undefined>(undefined);

  const navigateAndAdvance = useCallback(
    (targetStepId: string | undefined, advance: () => void) => {
      pendingTargetCleanupRef.current?.();
      pendingTargetCleanupRef.current = null;
      if (!stepRoutes || !targetStepId) {
        advance();
        return;
      }

      const targetRoute = stepRoutes[targetStepId];
      if (!targetRoute) {
        advance();
        return;
      }

      if (targetRoute !== currentRoute) router.push(targetRoute);
      pendingTargetCleanupRef.current = waitForTourTarget(targetStepId, advance, () => {
        pendingResumeIndexRef.current = undefined;
        controllerRef.current?.endTour();
      });
    },
    [currentRoute, router, stepRoutes],
  );

  const handleStart = useCallback(() => {
    const controller = controllerRef.current;
    const index = pendingResumeIndexRef.current ?? controller?.currentStepIndex;
    if (!resumeOnPause || !controller || index === undefined) return;

    const step = controller.tour[index];
    if (!step) return;

    // Keep the snapshot through another pause while the library resets to step 0 and the route loads.
    pendingResumeIndexRef.current = index;
    navigateAndAdvance(step.id, () => controller.setCurrentStepIndex(index));
  }, [navigateAndAdvance, resumeOnPause]);

  const handleStepChange = useCallback(
    (step: OnboardingTourStep) => {
      const index = pendingResumeIndexRef.current;
      if (index !== undefined && steps[index]?.id === step.id) {
        pendingResumeIndexRef.current = undefined;
      }
    },
    [steps],
  );

  const handleEnd = useCallback(() => {
    pendingResumeIndexRef.current = undefined;
    pendingTargetCleanupRef.current?.();
    pendingTargetCleanupRef.current = null;
    onEnd();
  }, [onEnd]);

  const bindForwardAction = useCallback((controller: TourController, action: () => void) => {
    forwardActionRef.current = action;
    return action;
  }, []);

  useEffect(() => {
    if (!started) {
      forwardActionRef.current = null;
      pendingTargetCleanupRef.current?.();
      pendingTargetCleanupRef.current = null;
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      forwardActionRef.current?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      pendingTargetCleanupRef.current?.();
      pendingTargetCleanupRef.current = null;
    };
  }, [started]);

  return (
    <OnboardingTour
      tour={steps}
      started={started}
      onOnboardingTourStart={handleStart}
      onOnboardingTourChange={handleStepChange}
      onOnboardingTourEnd={handleEnd}
      withStepper={false}
      header={(controller) => (
        <>
          <Group justify="center" gap={4} py={4}>
            <Text size="sm" fw={600}>
              {stepIndexFromController(controller) + 1}
            </Text>
            <Text size="sm" c="dimmed">
              /
            </Text>
            <Text size="sm" c="dimmed">
              {controller.tour.length}
            </Text>
          </Group>
          {stepIndexFromController(controller) === 0 && (
            <Center py="xs">
              <Image
                src={branding.logoImageUrl ?? "/logo/logo.png"}
                alt={`${branding.appName} logo`}
                w={64}
                h={64}
                fit="contain"
              />
            </Center>
          )}
        </>
      )}
      nextStepNavigation={(controller) => {
        const nextStep = stepAtOffset(controller, 1);
        const action = bindForwardAction(controller, () => {
          pendingResumeIndexRef.current = undefined;
          navigateAndAdvance(nextStep?.id, () => controller.nextStep());
        });
        return <TourForwardButton label={tCommon("next")} onClick={action} />;
      }}
      endStepNavigation={(controller) => {
        const action = bindForwardAction(controller, () => controller.endTour());
        return <TourDoneButton label={tTour("done")} onClick={action} />;
      }}
      prevStepNavigation={(controller) => (
        <Button
          size="sm"
          variant="default"
          onClick={() => {
            pendingResumeIndexRef.current = undefined;
            const prevStep = stepAtOffset(controller, -1);
            navigateAndAdvance(prevStep?.id, () => controller.prevStep());
          }}
        >
          {tTour("prev")}
        </Button>
      )}
      skipNavigation={(controller) => (
        <Button size="sm" variant="subtle" color="gray" onClick={() => controller.skipTour()}>
          {tTour("skip")}
        </Button>
      )}
      withPrevButton
      focusRevealProps={(controller) => {
        controllerRef.current = controller;
        return {
          disableTargetInteraction: true,
          popoverProps: {
            position: position ?? { base: "bottom", md: "right" },
            width: { base: "calc(100vw - 32px)", md: 420 },
            shadow: "xl",
            radius: "lg",
            middlewares: { shift: { padding: 16 }, flip: true },
          },
        };
      }}
      cutoutPadding={12}
      cutoutRadius={12}
    >
      {children}
    </OnboardingTour>
  );
};
