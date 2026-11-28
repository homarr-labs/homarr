import type {
  SmartHomeAction,
  SmartHomeActionReceipt,
  SmartHomeCameraStream,
  SmartHomeWebRtcMessage,
  SmartHomeCatalog,
  SmartHomeEntityPatch,
  SmartHomeEntitySelection,
  SmartHomeForecastDay,
  SmartHomeHistorySeries,
  SmartHomeSnapshot,
} from "./smart-home-types";

/** Integrations that can stream a camera live; others only offer its snapshot. */
export interface ISmartHomeCameraStreamIntegration {
  /** The best stream the camera offers; "hls" asks for HLS only, e.g. after WebRTC failed. */
  getCameraStreamAsync(entityId: string, prefer?: "hls"): Promise<SmartHomeCameraStream | null>;
}

/**
 * Integrations whose cameras stream over WebRTC. A session starts with the browser's offer and lasts until the
 * signal aborts: some integrations (Home Assistant) end the stream together with the session.
 */
export interface ISmartHomeCameraWebRtcIntegration {
  openCameraWebRtcSessionAsync(
    entityId: string,
    offerSdp: string,
    onMessage: (message: SmartHomeWebRtcMessage) => void,
    signal: AbortSignal,
  ): Promise<void>;
}

/** Resolves when the signal aborts. */
export const untilAborted = (signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    signal.addEventListener("abort", () => resolve(), { once: true });
  });

export interface ISmartHomeIntegration {
  getSnapshotAsync(selection: SmartHomeEntitySelection): Promise<SmartHomeSnapshot>;
  getCatalogAsync(): Promise<SmartHomeCatalog>;
  getHistoryAsync(entityIds: string[], hours: number, samples: number): Promise<SmartHomeHistorySeries[]>;
  getForecastAsync(entityId: string, type: "daily" | "hourly"): Promise<SmartHomeForecastDay[]>;
  executeActionAsync(entityId: string, action: SmartHomeAction): Promise<SmartHomeActionReceipt | void>;
  subscribeEntitiesAsync(
    selection: SmartHomeEntitySelection,
    onPatch: (patch: SmartHomeEntityPatch) => void,
    signal: AbortSignal,
  ): Promise<void>;
}
