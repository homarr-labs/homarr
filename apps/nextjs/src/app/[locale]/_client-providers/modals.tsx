"use client";

import type { PropsWithChildren } from "react";

import { useScopedI18n } from "@homarr/translation/client";

import { ModalsManager } from "../modals";

export const ModalsProvider = ({ children }: PropsWithChildren) => {
  const t = useScopedI18n("common.action");
  return (
    <ModalsManager
      labels={{
        cancel: t("cancel"),
        confirm: t("confirm"),
      }}
      modalProps={{
        styles: {
          title: {
            fontSize: "1.25rem",
            fontWeight: 500,
          },
        },
      }}
    >
      {children}
    </ModalsManager>
  );
};
