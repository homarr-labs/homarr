"use client";

import { useTiks } from "@rexa-developer/tiks/react";
import { defineTheme } from "@rexa-developer/tiks";

const welcomeTheme = defineTheme({
  name: "homarr-welcome",
  baseFreq: 360,
  attack: 0.01,
  decay: 2.2,
});

export const useOnboardingSounds = () =>
  useTiks({
    theme: "soft",
    volume: 0.12,
    respectReducedMotion: true,
  });

export const useWelcomeSound = () =>
  useTiks({
    theme: welcomeTheme,
    volume: 0.08,
    respectReducedMotion: true,
  });
