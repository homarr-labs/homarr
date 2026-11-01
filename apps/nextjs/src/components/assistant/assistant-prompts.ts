"use client";

import { useMemo } from "react";
import { IconActivityHeartbeat, IconApps, IconPalette, IconSearch, IconWand } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

export const assistantPromptDefinitions = [
  { id: "health", key: "health", Icon: IconActivityHeartbeat },
  { id: "explore", key: "explore", Icon: IconApps },
  { id: "media", key: "media", Icon: IconSearch },
  { id: "style", key: "style", Icon: IconPalette },
  { id: "design-widget", key: "designWidget", Icon: IconWand },
] as const;

export const useAssistantPrompts = () => {
  const t = useI18n("assistant");
  return useMemo(
    () =>
      assistantPromptDefinitions.map((definition) => ({
        ...definition,
        label: t(`suggestions.${definition.key}.label`),
        prompt: t(`suggestions.${definition.key}.prompt`),
        description: t(`commands.${definition.key}`),
      })),
    [t],
  );
};
