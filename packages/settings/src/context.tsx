"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

import type { ServerSettings } from "@homarr/server-settings";

import type { SettingsContextProps, UserSettings } from "./creator";
import { createSettings } from "./creator";

const SettingsContext = createContext<SettingsContextProps | null>(null);

export const SettingsProvider = ({
  user,
  serverSettings,
  children,
}: PropsWithChildren<{ user: UserSettings | null; serverSettings: ServerSettings }>) => {
  return (
    <SettingsContext.Provider value={createSettings({ user, serverSettings })}>{children}</SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);

  if (!context) throw new Error("useSettingsContext must be used within a SettingsProvider");

  return context;
};
