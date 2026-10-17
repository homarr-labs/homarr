"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext, useMemo } from "react";

import type { PublicServerSettings, SettingsContextProps, UserSettings } from "./creator";
import { createSettings } from "./creator";

const SettingsContext = createContext<SettingsContextProps | null>(null);

export const SettingsProvider = ({
  user,
  serverSettings,
  children,
}: PropsWithChildren<{ user: UserSettings | null; serverSettings: PublicServerSettings }>) => {
  const settings = useMemo(() => createSettings({ user, serverSettings }), [user, serverSettings]);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => {
  const context = useContext(SettingsContext);

  if (!context) throw new Error("useSettingsContext must be used within a SettingsProvider");

  return context;
};
