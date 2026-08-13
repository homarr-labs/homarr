"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useComputedColorScheme } from "@mantine/core";
import confetti from "canvas-confetti";

import classes from "./onboarding-studio.module.css";
import { recolorWordmark } from "./wordmark-colors";

interface OnboardingWordmarkProps {
  primaryColor?: string;
  secondaryColor?: string;
  large?: boolean;
}

const wordmarkUrl = "/logo/homarr-wordmark-light.svg";

export const OnboardingWordmark = ({ primaryColor, secondaryColor, large = false }: OnboardingWordmarkProps) => {
  const [source, setSource] = useState<string | null>(null);
  const colorScheme = useComputedColorScheme("light");
  const recolored = Boolean(source && primaryColor && secondaryColor);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(wordmarkUrl, { signal: controller.signal })
      .then((response) => (response.ok ? response.text() : null))
      .then((svg) => {
        if (svg) setSource(svg);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const src = useMemo(() => {
    if (!source || !primaryColor || !secondaryColor) return wordmarkUrl;
    return `data:image/svg+xml,${encodeURIComponent(
      recolorWordmark(source, primaryColor, secondaryColor, colorScheme === "light" ? "#1A1B1E" : undefined),
    )}`;
  }, [colorScheme, primaryColor, secondaryColor, source]);

  const celebrate = (event: ReactMouseEvent<HTMLImageElement>) => {
    const logo = event.currentTarget.getBoundingClientRect();
    void confetti({
      particleCount: 60,
      spread: 65,
      startVelocity: 32,
      origin: {
        x: (logo.left + logo.width / 2) / window.innerWidth,
        y: (logo.top + logo.height / 2) / window.innerHeight,
      },
      colors: primaryColor && secondaryColor ? [primaryColor, secondaryColor] : undefined,
      disableForReducedMotion: true,
    });
  };

  return (
    <img
      src={src}
      alt="Homarr"
      data-recolored={recolored || undefined}
      className={`${classes.wordmark} ${classes.onboardingWordmark} ${large ? classes.welcomeWordmark : ""}`}
      onMouseEnter={celebrate}
    />
  );
};
