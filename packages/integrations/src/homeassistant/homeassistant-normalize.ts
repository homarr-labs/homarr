import type {
  SmartHomeArea,
  SmartHomeCatalog,
  SmartHomeCatalogEntity,
  SmartHomeEntity,
  SmartHomeEntityAttributes,
  SmartHomeFloor,
} from "../interfaces/smart-home/smart-home-types";
import type { HomeAssistantRegistry, RawEntityState } from "./homeassistant-types";
import { getLightCapabilities } from "../interfaces/smart-home/smart-home-capabilities";

const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
const text = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : undefined);
const boolean = (value: unknown) => (typeof value === "boolean" ? value : undefined);
const texts = (value: unknown) =>
  Array.isArray(value) && value.every((item) => typeof item === "string") ? (value as string[]) : undefined;
const timestamp = (value: unknown) => {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? undefined : parsed;
};
const rgb = (value: unknown): [number, number, number] | undefined => {
  if (!Array.isArray(value) || value.length !== 3) return undefined;
  const [red, green, blue] = value.map(number);
  if (red === undefined || green === undefined || blue === undefined) return undefined;
  return [red, green, blue];
};
const percentOf255 = (value: unknown) => {
  const parsed = number(value);
  return parsed === undefined ? undefined : Math.round((parsed / 255) * 100);
};

const compact = (attributes: SmartHomeEntityAttributes): SmartHomeEntityAttributes =>
  Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => value !== undefined),
  ) as SmartHomeEntityAttributes;

const domainAttributes = (domain: string, attributes: Record<string, unknown>): SmartHomeEntityAttributes => {
  switch (domain) {
    case "light": {
      const colorModes = texts(attributes.supported_color_modes);
      const capabilities = getLightCapabilities({ colorModes });
      return {
        brightness: capabilities.brightness ? percentOf255(attributes.brightness) : undefined,
        colorTempKelvin: capabilities.colorTemperature ? number(attributes.color_temp_kelvin) : undefined,
        minColorTempKelvin: number(attributes.min_color_temp_kelvin),
        maxColorTempKelvin: number(attributes.max_color_temp_kelvin),
        rgbColor: capabilities.color ? rgb(attributes.rgb_color) : undefined,
        colorMode: text(attributes.color_mode),
        colorModes,
        effect: text(attributes.effect),
        effects: texts(attributes.effect_list),
      };
    }
    case "climate":
      return {
        currentTemperature: number(attributes.current_temperature),
        targetTemperature:
          ((number(attributes.supported_features) ?? 0) & 1) !== 0 ? number(attributes.temperature) : undefined,
        targetTemperatureLow:
          ((number(attributes.supported_features) ?? 0) & 2) !== 0 ? number(attributes.target_temp_low) : undefined,
        targetTemperatureHigh:
          ((number(attributes.supported_features) ?? 0) & 2) !== 0 ? number(attributes.target_temp_high) : undefined,
        minTemperature: number(attributes.min_temp),
        maxTemperature: number(attributes.max_temp),
        temperatureStep: number(attributes.target_temp_step),
        temperatureUnit: text(attributes.temperature_unit),
        hvacModes: texts(attributes.hvac_modes),
        hvacAction: text(attributes.hvac_action),
        presetMode: text(attributes.preset_mode),
        presetModes: texts(attributes.preset_modes),
        fanMode: text(attributes.fan_mode),
        fanModes: texts(attributes.fan_modes),
        currentHumidity: number(attributes.current_humidity),
        targetHumidity: number(attributes.humidity),
        minHumidity: number(attributes.min_humidity),
        maxHumidity: number(attributes.max_humidity),
      };
    case "water_heater":
      return {
        currentTemperature: number(attributes.current_temperature),
        targetTemperature: number(attributes.temperature),
        minTemperature: number(attributes.min_temp),
        maxTemperature: number(attributes.max_temp),
        mode: text(attributes.operation_mode),
        modes: texts(attributes.operation_list),
      };
    case "humidifier":
      return {
        currentHumidity: number(attributes.current_humidity),
        targetHumidity: number(attributes.humidity),
        minHumidity: number(attributes.min_humidity),
        maxHumidity: number(attributes.max_humidity),
        mode: text(attributes.mode),
        modes: texts(attributes.available_modes),
        hvacAction: text(attributes.action),
      };
    case "cover":
    case "valve":
      return {
        position: number(attributes.current_position),
        tiltPosition: number(attributes.current_tilt_position),
      };
    case "fan":
      return {
        percentage: number(attributes.percentage),
        percentageStep: number(attributes.percentage_step),
        oscillating: boolean(attributes.oscillating),
        direction: text(attributes.direction),
        presetMode: text(attributes.preset_mode),
        presetModes: texts(attributes.preset_modes),
      };
    case "media_player":
      return {
        mediaTitle: text(attributes.media_title),
        mediaArtist: text(attributes.media_artist) ?? text(attributes.media_album_artist),
        mediaAlbum: text(attributes.media_album_name),
        mediaSeriesTitle: text(attributes.media_series_title),
        mediaContentType: text(attributes.media_content_type),
        mediaSource: text(attributes.source),
        sources: texts(attributes.source_list),
        appName: text(attributes.app_name),
        volume: number(attributes.volume_level),
        isMuted: boolean(attributes.is_volume_muted),
        mediaDuration: number(attributes.media_duration),
        mediaPosition: number(attributes.media_position),
        mediaPositionUpdatedAt: timestamp(attributes.media_position_updated_at),
        shuffle: boolean(attributes.shuffle),
        repeat: text(attributes.repeat),
      };
    case "weather":
      return {
        currentTemperature: number(attributes.temperature),
        temperatureUnit: text(attributes.temperature_unit),
        humidity: number(attributes.humidity),
        pressure: number(attributes.pressure),
        windSpeed: number(attributes.wind_speed),
        windSpeedUnit: text(attributes.wind_speed_unit),
      };
    case "update":
      return {
        installedVersion: text(attributes.installed_version),
        latestVersion: text(attributes.latest_version),
        releaseSummary: text(attributes.release_summary),
        releaseUrl: text(attributes.release_url),
        inProgress: boolean(attributes.in_progress),
      };
    case "automation":
    case "script":
      return {
        lastTriggered: timestamp(attributes.last_triggered),
        currentRunCount: number(attributes.current),
      };
    case "alarm_control_panel":
      return {
        codeRequired: boolean(attributes.code_arm_required),
        codeFormat: text(attributes.code_format),
      };
    case "lock":
      return { codeFormat: text(attributes.code_format) };
    case "vacuum":
    case "lawn_mower":
      return {
        status: text(attributes.status),
        fanSpeed: text(attributes.fan_speed),
        fanSpeeds: texts(attributes.fan_speed_list),
      };
    case "input_select":
    case "select":
      return { options: texts(attributes.options) };
    case "input_number":
    case "number":
      return {
        min: number(attributes.min),
        max: number(attributes.max),
        step: number(attributes.step),
        mode: text(attributes.mode),
      };
    case "counter":
      return { min: number(attributes.minimum), max: number(attributes.maximum), step: number(attributes.step) };
    case "sun":
      return { nextSetting: timestamp(attributes.next_setting), nextRising: timestamp(attributes.next_rising) };
    case "timer":
      return {
        remaining: text(attributes.remaining),
        duration: text(attributes.duration),
        finishesAt: timestamp(attributes.finishes_at),
      };
    case "calendar":
      return {
        message: text(attributes.message),
        startTime: timestamp(attributes.start_time),
        endTime: timestamp(attributes.end_time),
        location: text(attributes.location),
      };
    default:
      return {};
  }
};

export const getEntityDomain = (entityId: string) => entityId.split(".")[0] ?? entityId;

export const normalizeEntity = (
  raw: RawEntityState,
  context: { areaId: string | null; registryName?: string; registryIcon?: string },
): SmartHomeEntity => {
  const domain = getEntityDomain(raw.entityId);
  const attributes = raw.attributes;
  return {
    id: raw.entityId,
    domain,
    name: text(attributes.friendly_name) ?? context.registryName ?? raw.entityId,
    areaId: context.areaId,
    state: raw.state,
    icon: text(attributes.icon) ?? context.registryIcon ?? null,
    deviceClass: text(attributes.device_class) ?? null,
    stateClass: text(attributes.state_class) ?? null,
    unit: text(attributes.unit_of_measurement) ?? null,
    lastChanged: raw.lastChanged,
    lastUpdated: raw.lastUpdated,
    contextId: raw.contextId,
    attributes: compact({
      supportedFeatures: number(attributes.supported_features),
      batteryLevel: number(attributes.battery_level),
      ...domainAttributes(domain, attributes),
    }),
  };
};

export interface EntityRegistryContext {
  areaId: string | null;
  registryName?: string;
  registryIcon?: string;
  hidden: boolean;
}

export const createRegistryLookup = (registry: HomeAssistantRegistry | null) => {
  const deviceAreas = new Map((registry?.devices ?? []).map((device) => [device.id, device.area_id ?? null]));
  const entries = new Map(
    (registry?.entities.entities ?? []).map((entry): [string, EntityRegistryContext] => [
      entry.ei,
      {
        areaId: entry.ai ?? (entry.di ? (deviceAreas.get(entry.di) ?? null) : null),
        registryName: entry.en,
        registryIcon: entry.ic,
        hidden: entry.hb === true || entry.ec !== undefined,
      },
    ]),
  );
  return (entityId: string): EntityRegistryContext => entries.get(entityId) ?? { areaId: null, hidden: false };
};

export const normalizeAreas = (registry: HomeAssistantRegistry | null): SmartHomeArea[] =>
  (registry?.areas ?? []).map((area) => ({
    id: area.area_id,
    name: area.name,
    floorId: area.floor_id ?? null,
    icon: area.icon ?? null,
    temperatureEntityId: area.temperature_entity_id ?? null,
    humidityEntityId: area.humidity_entity_id ?? null,
  }));

export const normalizeFloors = (registry: HomeAssistantRegistry | null): SmartHomeFloor[] =>
  (registry?.floors ?? []).map((floor) => ({
    id: floor.floor_id,
    name: floor.name,
    level: floor.level ?? null,
    icon: floor.icon ?? null,
  }));

export const createCatalog = (
  states: Iterable<RawEntityState>,
  registry: HomeAssistantRegistry | null,
): SmartHomeCatalog => {
  const lookup = createRegistryLookup(registry);
  const entities = [...states].map((raw): SmartHomeCatalogEntity => {
    const context = lookup(raw.entityId);
    const entity = normalizeEntity(raw, context);
    return {
      id: entity.id,
      domain: entity.domain,
      name: entity.name,
      areaId: entity.areaId,
      icon: entity.icon,
      deviceClass: entity.deviceClass,
      hidden: context.hidden,
    };
  });
  return {
    entities: entities.toSorted((left, right) => left.name.localeCompare(right.name)),
    areas: normalizeAreas(registry),
    floors: normalizeFloors(registry),
  };
};
