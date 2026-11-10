export interface SmartHomeForecastDay {
  time: number;
  condition: string;
  temperatureHigh: number | null;
  temperatureLow: number | null;
  precipitationProbability: number | null;
}

export interface SmartHomeEntityAttributes {
  supportedFeatures?: number;
  brightness?: number;
  colorTempKelvin?: number;
  minColorTempKelvin?: number;
  maxColorTempKelvin?: number;
  rgbColor?: [number, number, number];
  colorMode?: string;
  colorModes?: string[];
  effect?: string;
  effects?: string[];
  currentTemperature?: number;
  targetTemperature?: number;
  targetTemperatureLow?: number;
  targetTemperatureHigh?: number;
  minTemperature?: number;
  maxTemperature?: number;
  temperatureStep?: number;
  temperatureUnit?: string;
  hvacModes?: string[];
  hvacAction?: string;
  presetMode?: string;
  presetModes?: string[];
  fanMode?: string;
  fanModes?: string[];
  currentHumidity?: number;
  targetHumidity?: number;
  minHumidity?: number;
  maxHumidity?: number;
  mode?: string;
  modes?: string[];
  position?: number;
  tiltPosition?: number;
  percentage?: number;
  percentageStep?: number;
  oscillating?: boolean;
  direction?: string;
  mediaTitle?: string;
  mediaArtist?: string;
  mediaAlbum?: string;
  mediaSeriesTitle?: string;
  mediaContentType?: string;
  mediaSource?: string;
  sources?: string[];
  appName?: string;
  volume?: number;
  isMuted?: boolean;
  mediaDuration?: number;
  mediaPosition?: number;
  mediaPositionUpdatedAt?: number;
  shuffle?: boolean;
  repeat?: string;
  batteryLevel?: number;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  windSpeedUnit?: string;
  installedVersion?: string;
  latestVersion?: string;
  releaseSummary?: string;
  releaseUrl?: string;
  inProgress?: boolean;
  lastTriggered?: number;
  currentRunCount?: number;
  zone?: string;
  codeRequired?: boolean;
  codeFormat?: string;
  status?: string;
  fanSpeed?: string;
  fanSpeeds?: string[];
  nextSetting?: number;
  nextRising?: number;
  remaining?: string;
  duration?: string;
  finishesAt?: number;
  message?: string;
  startTime?: number;
  endTime?: number;
  location?: string;
  pictureUrl?: string;
}

export interface SmartHomeEntity {
  id: string;
  domain: string;
  name: string;
  areaId: string | null;
  state: string;
  icon: string | null;
  deviceClass: string | null;
  stateClass: string | null;
  unit: string | null;
  lastChanged: number;
  lastUpdated: number;
  contextId?: string;
  attributes: SmartHomeEntityAttributes;
}

export interface SmartHomeActionReceipt {
  contextId: string;
}

export interface SmartHomeArea {
  id: string;
  name: string;
  floorId: string | null;
  icon: string | null;
  temperatureEntityId: string | null;
  humidityEntityId: string | null;
}

export interface SmartHomeFloor {
  id: string;
  name: string;
  level: number | null;
  icon: string | null;
}

export interface SmartHomeCatalogEntity {
  id: string;
  domain: string;
  name: string;
  areaId: string | null;
  icon: string | null;
  deviceClass: string | null;
  hidden: boolean;
}

export interface SmartHomeCatalog {
  entities: SmartHomeCatalogEntity[];
  areas: SmartHomeArea[];
  floors: SmartHomeFloor[];
}

export interface SmartHomeEntitySelection {
  entityIds?: string[];
  areaIds?: string[];
  domains?: string[];
  excludedEntityIds?: string[];
}

export const SMART_HOME_ENTITY_LIMIT = 400;

export class SmartHomeSelectionLimitError extends Error {
  public constructor(
    public readonly count: number,
    public readonly limit = SMART_HOME_ENTITY_LIMIT,
  ) {
    super(`Selected ${count} Home Assistant entities; the maximum is ${limit}. Narrow the selection.`);
    this.name = "SmartHomeSelectionLimitError";
  }
}

export interface SmartHomeSnapshot {
  entities: SmartHomeEntity[];
  areas: SmartHomeArea[];
  updatedAt: number;
}

export interface SmartHomeHistoryPoint {
  time: number;
  value: number | null;
}

export interface SmartHomeHistorySeries {
  entityId: string;
  points: SmartHomeHistoryPoint[];
}

export interface SmartHomeEntityPatch {
  changed: SmartHomeEntity[];
  removed: string[];
  areas?: SmartHomeArea[];
}

export type SmartHomeAction =
  | { type: "toggle" }
  | { type: "turnOn" }
  | { type: "turnOff" }
  | { type: "setBrightness"; value: number }
  | { type: "setColorTemp"; value: number }
  | { type: "setRgbColor"; value: [number, number, number] }
  | { type: "setEffect"; value: string }
  | { type: "setTemperature"; value: number }
  | { type: "setTemperatureRange"; low: number; high: number }
  | { type: "setHvacMode"; value: string }
  | { type: "setPresetMode"; value: string }
  | { type: "setFanMode"; value: string }
  | { type: "setHumidity"; value: number }
  | { type: "setMode"; value: string }
  | { type: "setPosition"; value: number }
  | { type: "setTiltPosition"; value: number }
  | { type: "open" }
  | { type: "close" }
  | { type: "stop" }
  | { type: "lock"; code?: string }
  | { type: "unlock"; code?: string }
  | { type: "openLatch"; code?: string }
  | { type: "mediaPlayPause" }
  | { type: "mediaPlay" }
  | { type: "mediaPause" }
  | { type: "mediaNext" }
  | { type: "mediaPrevious" }
  | { type: "setVolume"; value: number }
  | { type: "setMuted"; value: boolean }
  | { type: "selectSource"; value: string }
  | { type: "trigger" }
  | { type: "selectOption"; value: string }
  | { type: "setValue"; value: number }
  | { type: "setFanPercentage"; value: number }
  | { type: "setOscillating"; value: boolean }
  | { type: "increment" }
  | { type: "decrement" }
  | { type: "vacuumStart" }
  | { type: "vacuumPause" }
  | { type: "vacuumReturn" }
  | { type: "vacuumLocate" }
  | { type: "alarmArm"; mode: "away" | "home" | "night" | "vacation" | "custom_bypass"; code?: string }
  | { type: "alarmDisarm"; code?: string }
  | { type: "install" }
  | { type: "timerStart" }
  | { type: "timerPause" }
  | { type: "timerCancel" };
