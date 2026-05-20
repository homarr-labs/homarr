"use client";

import type { PropsWithChildren } from "react";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { OnboardingTourController, OnboardingTourStep } from "@gfazioli/mantine-onboarding-tour";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import { Button, Center, Group, Image, Kbd, Text } from "@mantine/core";
import type { FloatingPosition } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import { homarrLogoPath } from "~/components/layout/logo/homarr-logo";

interface TourShellProps extends PropsWithChildren {
  steps: OnboardingTourStep[];
  started: boolean;
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

const pollForElement = (targetId: string, callback: () => void) => {
  const interval = setInterval(() => {
    const targetElement = document.querySelector(`[data-tour-target="${targetId}"]`);
    if (targetElement) {
      clearInterval(interval);
      callback();
    }
  }, 50);
  const timeout = setTimeout(() => clearInterval(interval), 5000);
  return () => {
    clearInterval(interval);
    clearTimeout(timeout);
  };
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

export const TourShell = ({ steps, started, onEnd, stepRoutes, position, children }: TourShellProps) => {
  const t = useI18n();
  const router = useRouter();
  const forwardActionRef = useRef<(() => void) | null>(null);

  const navigateAndAdvance = useCallback(
    (currentStepId: string | undefined, targetStepId: string | undefined, advance: () => void) => {
      if (!stepRoutes || !targetStepId) {
        advance();
        return;
      }

      const currentRoute = currentStepId ? stepRoutes[currentStepId] : undefined;
      const targetRoute = stepRoutes[targetStepId];

      if (targetRoute && targetRoute !== currentRoute) {
        router.push(targetRoute);
        pollForElement(targetStepId, advance);
      } else {
        advance();
      }
    },
    [router, stepRoutes],
  );

  const bindForwardAction = useCallback((controller: TourController, action: () => void) => {
    forwardActionRef.current = action;
    return action;
  }, []);

  useEffect(() => {
    if (!started) {
      forwardActionRef.current = null;
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      forwardActionRef.current?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [started]);

  return (
    <OnboardingTour
      tour={steps}
      started={started}
      onOnboardingTourEnd={onEnd}
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
              <Image src={homarrLogoPath} alt="Homarr" w={64} h={64} fit="contain" />
            </Center>
          )}
        </>
      )}
      nextStepNavigation={(controller) => {
        const nextStep = stepAtOffset(controller, 1);
        const action = bindForwardAction(controller, () => {
          navigateAndAdvance(controller.currentStep?.id, nextStep?.id, () => controller.nextStep());
        });
        return <TourForwardButton label={t("onboardingTour.next")} onClick={action} />;
      }}
      endStepNavigation={(controller) => {
        const action = bindForwardAction(controller, () => controller.endTour());
        return <TourDoneButton label={t("onboardingTour.done")} onClick={action} />;
      }}
      prevStepNavigation={(controller) => (
        <Button
          size="sm"
          variant="default"
          onClick={() => {
            const prevStep = stepAtOffset(controller, -1);
            navigateAndAdvance(controller.currentStep?.id, prevStep?.id, () => controller.prevStep());
          }}
        >
          {t("onboardingTour.prev")}
        </Button>
      )}
      skipNavigation={(controller) => (
        <Button size="sm" variant="subtle" color="gray" onClick={() => controller.skipTour()}>
          {t("onboardingTour.skip")}
        </Button>
      )}
      withPrevButton
      focusRevealProps={{
        disableTargetInteraction: true,
        popoverProps: {
          position: position ?? { base: "bottom", sm: "right" },
          width: 420,
          shadow: "xl",
          radius: "lg",
          middlewares: { shift: { padding: 16 }, flip: true },
        },
      }}
      cutoutPadding={12}
      cutoutRadius={12}
    >
      {children}
    </OnboardingTour>
  );
};
