import type { WidgetUiAuditFamily } from "../types";
import { beszelFamily } from "./beszel";
import { contentFamily } from "./content";
import { homeFamily } from "./home";
import { libraryFamily } from "./library";
import { mediaPipelineFamily } from "./media-pipeline";
import { mediaPlaybackFamily } from "./media-playback";
import { mediaRequestsFamily } from "./media-requests";
import { networkFamily } from "./network";
import { observabilityFamily } from "./observability";
import { securityFamily } from "./security";
import { serverMonitoringFamily } from "./server-monitoring";
import { toolsFamily } from "./tools";
import { utilityFamily } from "./utility";

export const WIDGET_UI_AUDIT_FAMILIES = [
  utilityFamily,
  networkFamily,
  mediaRequestsFamily,
  mediaPipelineFamily,
  serverMonitoringFamily,
  beszelFamily,
  observabilityFamily,
  securityFamily,
  libraryFamily,
  mediaPlaybackFamily,
  contentFamily,
  homeFamily,
  toolsFamily,
] as const satisfies readonly WidgetUiAuditFamily[];
