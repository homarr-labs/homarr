export const haDomains = [
  "light",
  "switch",
  "fan",
  "climate",
  "humidifier",
  "cover",
  "valve",
  "lock",
  "alarm_control_panel",
  "media_player",
  "camera",
  "vacuum",
  "scene",
  "script",
  "automation",
  "button",
  "input_boolean",
  "input_select",
  "person",
  "binary_sensor",
  "sensor",
  "weather",
  "sun",
  "update",
] as const;

export type HaDomain = (typeof haDomains)[number];

const knownDomains = new Set<string>(haDomains);
const domainAliases: Partial<Record<string, HaDomain>> = { select: "input_select", input_button: "button" };

const isHaDomain = (domain: string): domain is HaDomain => knownDomains.has(domain);

export const toSmartHomeDomain = (domain: string): { domain: HaDomain; readOnly: boolean } => {
  if (isHaDomain(domain)) return { domain, readOnly: false };
  const alias = domainAliases[domain];
  if (alias) return { domain: alias, readOnly: false };
  return { domain: "sensor", readOnly: true };
};

export interface HaForecastDay {
  time?: number;
  day: string;
  condition: string | null;
  high: number | null;
  low: number | null;
  precipitationProbability: number | null;
}

export interface HaAttributes {
  supportedFeatures?: number;
  brightness?: number;
  colorTempKelvin?: number;
  minColorTempKelvin?: number;
  maxColorTempKelvin?: number;
  rgbColor?: [number, number, number];
  colorMode?: string;
  colorModes?: string[];
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
  currentHumidity?: number;
  targetHumidity?: number;
  minHumidity?: number;
  maxHumidity?: number;
  position?: number;
  percentage?: number;
  mediaTitle?: string;
  mediaArtist?: string;
  mediaAlbum?: string;
  mediaSource?: string;
  artworkUrl?: string;
  volume?: number;
  isMuted?: boolean;
  mediaDuration?: number;
  mediaPosition?: number;
  mediaPositionUpdatedAt?: number;
  batteryLevel?: number;
  options?: string[];
  forecast?: HaForecastDay[];
  forecastStatus?: "loading" | "ready" | "unsupported" | "error";
  humidity?: number;
  windSpeed?: number;
  windSpeedUnit?: string;
  installedVersion?: string;
  latestVersion?: string;
  releaseSummary?: string;
  lastTriggered?: number;
  zone?: string;
  pictureUrl?: string;
  snapshotUrl?: string;
  nextSetting?: number;
  nextRising?: number;
  stateLabel?: string;
  codeRequired?: boolean;
  codeFormat?: string;
  status?: string;
}

export interface HaEntity {
  id: string;
  domain: HaDomain;
  name: string;
  areaId: string | null;
  state: string;
  icon: string | null;
  deviceClass: string | null;
  unit: string | null;
  lastChanged: number;
  attributes: HaAttributes;
  history: (number | null)[] | null;
  sourceDomain?: string;
  sourceAreaId?: string | null;
  readOnly?: boolean;
}

export interface HaArea {
  id: string;
  sourceId?: string;
  name: string;
  floor: string | null;
  temperatureEntityId: string | null;
  humidityEntityId: string | null;
}

export type HaAction =
  | { type: "toggle" }
  | { type: "turnOn" }
  | { type: "turnOff" }
  | { type: "setBrightness"; value: number }
  | { type: "setColorTemp"; value: number }
  | { type: "setRgbColor"; value: [number, number, number] }
  | { type: "setTemperature"; value: number }
  | { type: "setTemperatureRange"; low: number; high: number }
  | { type: "setHvacMode"; value: string }
  | { type: "setPresetMode"; value: string }
  | { type: "setHumidity"; value: number }
  | { type: "setPosition"; value: number }
  | { type: "open" }
  | { type: "close" }
  | { type: "stop" }
  | { type: "lock"; code?: string }
  | { type: "unlock"; code?: string }
  | { type: "mediaPlayPause" }
  | { type: "mediaNext" }
  | { type: "mediaPrevious" }
  | { type: "setVolume"; value: number }
  | { type: "trigger" }
  | { type: "selectOption"; value: string }
  | { type: "setFanPercentage"; value: number }
  | { type: "vacuumStart" }
  | { type: "vacuumReturn" }
  | { type: "alarmArm"; mode: "away" | "home" | "night"; code?: string }
  | { type: "alarmDisarm"; code?: string }
  | { type: "install" };

export const smartHomePresentations = ["entities", "controlPanel"] as const;
export type SmartHomePresentation = (typeof smartHomePresentations)[number];

export const smartHomeControlSizes = ["auto", "compact", "large"] as const;
export type SmartHomeControlSize = (typeof smartHomeControlSizes)[number];

export const smartHomeControlPalettes = ["boring", "colorful"] as const;
export type SmartHomeControlPalette = (typeof smartHomeControlPalettes)[number];

export type SmartHomeBlock =
  | { kind: "entity"; id: string; source: string | null; entityId: string }
  | { kind: "areas"; id: string; source: string | null; areaIds: string[] };

export interface SmartHomeConfiguration {
  integrationId: string | null;
  presentation: SmartHomePresentation;
  title: string;
  blockIds: readonly string[];
  roomDomains: readonly HaDomain[];
  excludedEntityIds: readonly string[];
  showSummary: boolean;
  controlSize: SmartHomeControlSize;
  palette: SmartHomeControlPalette;
  readOnly: boolean;
  advanced: boolean;
}

export interface SmartHomeOptionsPatch {
  blocks?: string[];
  presentation?: SmartHomePresentation;
}

export type SmartHomeInteractionBlock = "editing" | "readOnly" | "noPermission";

export type SmartHomeActionResult = "applied" | "unconfirmed" | "failed" | "superseded" | "blocked";

export interface SmartHomeEntityError {
  kind: "failed" | "unconfirmed";
  action: HaAction["type"];
  message: string;
  at: number;
}
