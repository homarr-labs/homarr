"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

import { clientApi } from "@homarr/api/client";

import type { WidgetOptionsSettings } from "./definition";

const WidgetOptionSettingsContext = createContext<WidgetOptionsSettings | null>(null);

export const WidgetOptionSettingsProvider = ({ children }: PropsWithChildren) => {
  const [data] = clientApi.widget.options.getWidgetOptionSettings.useSuspenseQuery();

  return <WidgetOptionSettingsContext.Provider value={data}>{children}</WidgetOptionSettingsContext.Provider>;
};

export const useWidgetOptionSettings = () => {
  const context = useContext(WidgetOptionSettingsContext);

  if (!context) {
    throw new Error("useWidgetOptionSettings must be used within a WidgetOptionSettingsProvider");
  }

  return context;
};
