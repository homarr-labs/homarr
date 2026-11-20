import type {
  SmartHomeAction,
  SmartHomeActionReceipt,
  SmartHomeCatalog,
  SmartHomeEntityPatch,
  SmartHomeEntitySelection,
  SmartHomeForecastDay,
  SmartHomeHistorySeries,
  SmartHomeSnapshot,
} from "./smart-home-types";

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
