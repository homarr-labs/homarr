"use client";

import { useMemo } from "react";
import { IconPlus } from "@tabler/icons-react";

import { useModalAction } from "@homarr/modals";
import { useRegisterSpotlightContextResults } from "@homarr/spotlight";
import { useScopedI18n } from "@homarr/translation/client";

import { UniversalCreateModal } from "./universal-create-modal";

/** Keeps Universal Create available from ordinary Spotlight search, without requiring command mode. */
export const UniversalCreateSpotlightResult = () => {
  const t = useScopedI18n("universalCreate");
  const { openModal } = useModalAction(UniversalCreateModal);
  const item = useMemo(
    () => ({
      id: "universal-create",
      name: t("title"),
      description: t("trigger.description"),
      icon: IconPlus,
      alwaysVisible: true,
      interaction: () => ({
        type: "javaScript" as const,
        onSelect: () => {
          openModal({ entryPoint: "spotlight" });
        },
      }),
    }),
    [openModal, t],
  );

  useRegisterSpotlightContextResults("universal-create", [item], [item]);
  return null;
};
