"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import confetti from "canvas-confetti";

import HomarrWordmarkLight from "./homarr-wordmark-light";
import classes from "./onboarding-studio.module.css";
import { useOnboardingSounds } from "./use-onboarding-sounds";

interface OnboardingWordmarkProps {
  primaryColor?: string;
  secondaryColor?: string;
  large?: boolean;
}

const defaultWordmarkUrl = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/homarr-wordmark-light.svg";

export const OnboardingWordmark = ({ primaryColor, secondaryColor, large = false }: OnboardingWordmarkProps) => {
  const [celebrating, setCelebrating] = useState(false);
  const sounds = useOnboardingSounds();
  const className = `${classes.wordmark} ${classes.onboardingWordmark} ${large ? classes.welcomeWordmark : ""} ${celebrating ? classes.celebratingWordmark : ""}`;
  const colors = {
    "--homarr-wordmark-primary": primaryColor ?? "#F92424",
    "--homarr-wordmark-secondary": secondaryColor ?? "#FA5252",
    "--homarr-wordmark-foreground": "#FEFDFD",
  } as CSSProperties;

  const celebrate = (logoElement: Element) => {
    sounds.hover();
    const logo = logoElement.getBoundingClientRect();
    const originY = (logo.top + logo.height / 2) / window.innerHeight;
    const confettiColors = primaryColor && secondaryColor ? [primaryColor, secondaryColor] : undefined;

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setCelebrating(true);
    for (const { angle, originX } of [
      { angle: 165, originX: logo.left + logo.width * 0.12 },
      { angle: 15, originX: logo.right - logo.width * 0.12 },
    ]) {
      void confetti({
        particleCount: 28,
        angle,
        spread: 35,
        startVelocity: 14,
        gravity: 0.7,
        ticks: 90,
        scalar: 0.8,
        origin: { x: originX / window.innerWidth, y: originY },
        colors: confettiColors,
        disableForReducedMotion: true,
      });
    }
  };

  if (primaryColor === undefined && secondaryColor === undefined) {
    return <img src={defaultWordmarkUrl} alt="Homarr" width={1477} height={1054} className={className} />;
  }

  return (
    <HomarrWordmarkLight
      role="img"
      aria-label="Homarr"
      style={colors}
      className={className}
      onMouseEnter={(event) => celebrate(event.currentTarget)}
      onAnimationEnd={() => setCelebrating(false)}
    />
  );
};
