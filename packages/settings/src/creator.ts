import type { User } from "@homarr/db/schema";
import type { ServerSettings } from "@homarr/server-settings";
import { parseBrandingSettings } from "@homarr/server-settings";
import type { HeaderPreferences } from "@homarr/validation/user";
import { parseHeaderPreferences } from "@homarr/validation/user";

export type SettingsContextProps = Omit<
  Pick<
    User,
    | "firstDayOfWeek"
    | "defaultSearchEngineId"
    | "homeBoardId"
    | "mobileHomeBoardId"
    | "openSearchInNewTab"
    | "ddgBangs"
    | "pingIconsEnabled"
    | "enableRightClickOnWidgets"
    | "headerPreferences"
  >,
  "headerPreferences"
> & { headerPreferences: HeaderPreferences } & Pick<
    ServerSettings["board"],
    "enableStatusByDefault" | "forceDisableStatus"
  > &
  Pick<ServerSettings["user"], "enableGravatar"> & {
    branding: ServerSettings["branding"];
  };

export interface PublicServerSettings {
  search: Pick<ServerSettings["search"], "defaultSearchEngineId">;
  board: Pick<
    ServerSettings["board"],
    "homeBoardId" | "mobileHomeBoardId" | "enableStatusByDefault" | "forceDisableStatus"
  >;
  user: Pick<ServerSettings["user"], "enableGravatar">;
  branding: ServerSettings["branding"];
}

export type UserSettings = Pick<
  User,
  | "firstDayOfWeek"
  | "defaultSearchEngineId"
  | "homeBoardId"
  | "mobileHomeBoardId"
  | "openSearchInNewTab"
  | "ddgBangs"
  | "pingIconsEnabled"
  | "enableRightClickOnWidgets"
  | "headerPreferences"
>;

export const createSettings = ({
  user,
  serverSettings,
}: {
  user: UserSettings | null;
  serverSettings: PublicServerSettings;
}) => ({
  defaultSearchEngineId: user?.defaultSearchEngineId ?? serverSettings.search.defaultSearchEngineId,
  openSearchInNewTab: user?.openSearchInNewTab ?? true,
  ddgBangs: user?.ddgBangs ?? true,
  firstDayOfWeek: user?.firstDayOfWeek ?? (1 as const),
  homeBoardId: user?.homeBoardId ?? serverSettings.board.homeBoardId,
  mobileHomeBoardId: user?.mobileHomeBoardId ?? serverSettings.board.mobileHomeBoardId,
  pingIconsEnabled: user?.pingIconsEnabled ?? false,
  enableRightClickOnWidgets: user?.enableRightClickOnWidgets ?? true,
  headerPreferences: parseHeaderPreferences(user?.headerPreferences),
  enableStatusByDefault: serverSettings.board.enableStatusByDefault,
  forceDisableStatus: serverSettings.board.forceDisableStatus,
  enableGravatar: serverSettings.user.enableGravatar,
  branding: parseBrandingSettings(serverSettings.branding),
});
