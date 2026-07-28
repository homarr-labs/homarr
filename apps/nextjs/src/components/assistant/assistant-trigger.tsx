"use client";

import { Tooltip } from "@mantine/core";
import { IconRobot } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import { HeaderButton } from "../layout/header/button";
import { useOptionalHomarrAssistant } from "./assistant-provider";

export const AssistantHeaderButton = () => {
  const t = useScopedI18n("common.assistant");
  const assistant = useOptionalHomarrAssistant();
  if (!assistant?.enabled) return null;

  return (
    <Tooltip label={`${t("title")} (Mod+Shift+K)`} position="bottom">
      <HeaderButton onClick={assistant.open} aria-label={t("open")}>
        <IconRobot size={20} />
      </HeaderButton>
    </Tooltip>
  );
};
