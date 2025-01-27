"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";
import type { DayOfWeek } from "@mantine/dates";

import type { RouterOutputs } from "@homarr/api";
import type { User } from "@homarr/db/schema";
import type { ServerSettings } from "@homarr/server-settings";

type SettingsContextProps = Pick<
  User,
  | "firstDayOfWeek"
  | "defaultSearchEngineId"
  | "homeBoardId"
  | "mobileHomeBoardId"
  | "openSearchInNewTab"
  | "pingIconsEnabled"
>;

interface PublicServerSettings {
  search: Pick<ServerSettings["search"], "defaultSearchEngineId">;
  board: Pick<ServerSettings["board"], "homeBoardId" | "mobileHomeBoardId">;
}

const SettingsContext = createContext<SettingsContextProps | null>(null);

export const SettingsProvider = ({
  user,
  serverSettings,
  children,
}: PropsWithChildren<{ user: RouterOutputs["user"]["getById"] | null; serverSettings: PublicServerSettings }>) => {
  return (
    <SettingsContext.Provider
      value={{
        defaultSearchEngineId: user?.defaultSearchEngineId ?? serverSettings.search.defaultSearchEngineId,
        openSearchInNewTab: user?.openSearchInNewTab ?? true,
        firstDayOfWeek: (user?.firstDayOfWeek as DayOfWeek | undefined) ?? (1 as const),
        homeBoardId: user?.homeBoardId ?? serverSettings.board.homeBoardId,
        mobileHomeBoardId: user?.mobileHomeBoardId ?? serverSettings.board.mobileHomeBoardId,
        pingIconsEnabled: user?.pingIconsEnabled ?? false,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);

  if (!context) throw new Error("useSettingsContext must be used within a SettingsProvider");

  return context;
};
