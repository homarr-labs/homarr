import {
  DEFAULT_SABNZBD_INTEGRATION_OPTIONS,
  SABNZBD_HISTORY_WINDOW_OPTIONS,
  parseSabnzbdIntegrationOptions,
} from "@homarr/definitions";
import type { SabnzbdHistoryWindowDays, SabnzbdIntegrationOptions } from "@homarr/definitions";

export { SABNZBD_HISTORY_WINDOW_OPTIONS, parseSabnzbdIntegrationOptions };

export type SabnzbdOptionsModel = SabnzbdIntegrationOptions;
export type { SabnzbdHistoryWindowDays };

export const DEFAULT_SABNZBD_OPTIONS: SabnzbdOptionsModel = DEFAULT_SABNZBD_INTEGRATION_OPTIONS;
