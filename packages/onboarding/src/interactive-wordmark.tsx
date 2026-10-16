"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

import { celebrateWithConfetti } from "./confetti";
import HomarrWordmarkLight from "./homarr-wordmark-light";
import classes from "./onboarding-studio.module.css";
import { useOnboardingSounds } from "./use-onboarding-sounds";

interface InteractiveWordmarkProps {
  label: string;
  className: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export const InteractiveWordmark = ({ label, className, primaryColor, secondaryColor }: InteractiveWordmarkProps) => {
  const [celebrating, setCelebrating] = useState(false);
  const sounds = useOnboardingSounds();
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
      celebrateWithConfetti({
        particleCount: 28,
        angle,
        spread: 35,
        startVelocity: 14,
        gravity: 0.7,
        ticks: 90,
        scalar: 0.8,
        origin: { x: originX / window.innerWidth, y: originY },
        colors: confettiColors,
      });
    }
  };

  return (
    <HomarrWordmarkLight
      role="img"
      aria-label={label}
      style={colors}
      className={`${className} ${celebrating ? classes.celebratingWordmark : ""}`}
      onMouseEnter={(event) => celebrate(event.currentTarget)}
      onAnimationEnd={() => setCelebrating(false)}
    />
  );
};
