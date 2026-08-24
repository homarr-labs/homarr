"use client";

import { useMemo } from "react";

import { useRegisterSpotlightContextResults } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";

/**
 * Keeps the assistant discoverable in the spotlight when it is unavailable, without loading the
 * assistant runtime. Lives apart from `assistant-provider` so the disabled path stays cheap.
 */
export const useRegisterAssistantSpotlightPlaceholder = (description: string) => {
  const t = useI18n("assistant");
  const spotlightItem = useMemo(
    () => ({
      id: "homarr-assistant",
      name: t("spotlight"),
      icon: "/logo/logo.png",
      description,
      unavailable: true,
      alwaysVisible: true,
      placement: "fallback" as const,
      interaction: (_query: string) => ({ type: "none" as const }),
    }),
    [description, t],
  );

  useRegisterSpotlightContextResults("homarr-assistant", [spotlightItem], [spotlightItem]);
};
