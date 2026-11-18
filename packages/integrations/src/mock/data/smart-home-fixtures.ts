import type {
  SmartHomeArea,
  SmartHomeEntity,
  SmartHomeEntityAttributes,
  SmartHomeFloor,
  SmartHomeForecastDay,
} from "../../interfaces/smart-home/smart-home-types";

const now = Date.now();
const minutesAgo = (minutes: number) => now - minutes * 60_000;

const dailyCurve = (base: number, amplitude: number, peakHour = 15) => {
  const currentHour = new Date(now).getUTCHours();
  const currentWave = Math.cos(((currentHour - peakHour) / 24) * Math.PI * 2);
  return Array.from({ length: 24 }, (_, index) => {
    const hour = (currentHour - 23 + index + 24) % 24;
    const wave = Math.cos(((hour - peakHour) / 24) * Math.PI * 2);
    return Math.round((base + (wave - currentWave) * amplitude) * 10) / 10;
  });
};

interface EntityInput {
  id: string;
  name: string;
  areaId: string | null;
  state: string;
  icon?: string;
  deviceClass?: string;
  unit?: string;
  changedMinutesAgo?: number;
  attributes?: SmartHomeEntityAttributes & { forecast?: SmartHomeForecastDay[] };
  history?: number[];
}

export const mockSmartHomeHistory = new Map<string, number[]>();
export const mockSmartHomeForecasts = new Map<string, SmartHomeForecastDay[]>();

const entity = (input: EntityInput): SmartHomeEntity => {
  const { forecast, ...attributes } = input.attributes ?? {};
  if (input.history) mockSmartHomeHistory.set(input.id, input.history);
  if (forecast) mockSmartHomeForecasts.set(input.id, forecast);
  const changedAt = minutesAgo(input.changedMinutesAgo ?? 42);
  return {
    id: input.id,
    domain: input.id.split(".")[0] ?? input.id,
    name: input.name,
    areaId: input.areaId,
    state: input.state,
    icon: input.icon ?? null,
    deviceClass: input.deviceClass ?? null,
    stateClass: input.history ? "measurement" : null,
    unit: input.unit ?? null,
    lastChanged: changedAt,
    lastUpdated: changedAt,
    attributes,
  };
};

const forecastDays = [
  ["partlycloudy", 15, 8, 10],
  ["rainy", 12, 7, 80],
  ["cloudy", 11, 6, 30],
  ["sunny", 14, 5, 0],
] as const;

export const mockSmartHomeFloors: SmartHomeFloor[] = [
  { id: "ground", name: "Ground floor", level: 0, icon: null },
  { id: "first", name: "First floor", level: 1, icon: null },
];

export const mockSmartHomeAreas: SmartHomeArea[] = [
  {
    id: "living_room",
    name: "Living Room",
    floorId: "ground",
    icon: null,
    temperatureEntityId: "sensor.living_room_temperature",
    humidityEntityId: "sensor.living_room_humidity",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    floorId: "ground",
    icon: null,
    temperatureEntityId: "sensor.kitchen_temperature",
    humidityEntityId: "sensor.kitchen_humidity",
  },
  {
    id: "office",
    name: "Office",
    floorId: "ground",
    icon: null,
    temperatureEntityId: "sensor.office_temperature",
    humidityEntityId: "sensor.office_humidity",
  },
  {
    id: "bedroom",
    name: "Bedroom",
    floorId: "first",
    icon: null,
    temperatureEntityId: "sensor.bedroom_temperature",
    humidityEntityId: "sensor.bedroom_humidity",
  },
  {
    id: "outside",
    name: "Outside",
    floorId: null,
    icon: null,
    temperatureEntityId: "sensor.outside_temperature",
    humidityEntityId: null,
  },
];

export const mockSmartHomeEntities: SmartHomeEntity[] = [
  entity({
    id: "light.living_room_ceiling",
    name: "Ceiling light",
    areaId: "living_room",
    state: "on",
    changedMinutesAgo: 95,
    attributes: {
      brightness: 72,
      colorTempKelvin: 3000,
      colorMode: "color_temp",
      colorModes: ["color_temp"],
      minColorTempKelvin: 2200,
      maxColorTempKelvin: 6500,
    },
  }),
  entity({
    id: "light.living_room_lamp",
    name: "Floor lamp",
    areaId: "living_room",
    state: "on",
    changedMinutesAgo: 64,
    attributes: {
      brightness: 38,
      rgbColor: [255, 164, 92],
      colorMode: "rgb",
      colorModes: ["rgb", "color_temp"],
      minColorTempKelvin: 2000,
      maxColorTempKelvin: 6500,
    },
  }),
  entity({
    id: "media_player.living_room_tv",
    name: "Living Room TV",
    areaId: "living_room",
    state: "playing",
    deviceClass: "tv",
    changedMinutesAgo: 51,
    attributes: {
      supportedFeatures: 1 | 4 | 8 | 16 | 32 | 16384,
      mediaTitle: "Big Buck Bunny",
      mediaSource: "Jellyfin",
      volume: 0.32,
      isMuted: false,
      mediaDuration: 596,
      mediaPosition: 120,
      mediaPositionUpdatedAt: Date.now(),
    },
  }),
  entity({
    id: "climate.living_room",
    name: "Thermostat",
    areaId: "living_room",
    state: "heat",
    unit: "°C",
    changedMinutesAgo: 300,
    attributes: {
      currentTemperature: 20.5,
      supportedFeatures: 17,
      targetTemperature: 21.5,
      minTemperature: 7,
      maxTemperature: 30,
      temperatureStep: 0.5,
      hvacModes: ["off", "heat", "cool", "auto"],
      hvacAction: "heating",
      presetMode: "comfort",
      presetModes: ["eco", "comfort", "away"],
    },
  }),
  entity({
    id: "sensor.living_room_temperature",
    name: "Temperature",
    areaId: "living_room",
    state: "20.5",
    deviceClass: "temperature",
    unit: "°C",
    history: dailyCurve(20.5, 0.9),
  }),
  entity({
    id: "sensor.living_room_humidity",
    name: "Humidity",
    areaId: "living_room",
    state: "46",
    deviceClass: "humidity",
    unit: "%",
    history: dailyCurve(46, 3),
  }),
  entity({
    id: "cover.living_room_blinds",
    name: "Blinds",
    areaId: "living_room",
    state: "open",
    deviceClass: "blind",
    changedMinutesAgo: 480,
    attributes: { supportedFeatures: 1 | 2 | 4 | 8, position: 70 },
  }),
  entity({
    id: "scene.movie_night",
    name: "Movie night",
    areaId: "living_room",
    state: new Date(minutesAgo(1260)).toISOString(),
    icon: "mdi:movie-open",
    changedMinutesAgo: 1260,
  }),
  entity({
    id: "switch.coffee_machine",
    name: "Coffee machine",
    areaId: "kitchen",
    state: "on",
    icon: "mdi:coffee-maker",
    changedMinutesAgo: 12,
  }),
  entity({
    id: "light.kitchen_counter",
    name: "Counter lights",
    areaId: "kitchen",
    state: "on",
    changedMinutesAgo: 15,
    attributes: {
      brightness: 85,
      colorTempKelvin: 3500,
      colorMode: "color_temp",
      colorModes: ["color_temp"],
      minColorTempKelvin: 2200,
      maxColorTempKelvin: 6500,
    },
  }),
  entity({
    id: "sensor.kitchen_temperature",
    name: "Temperature",
    areaId: "kitchen",
    state: "22.1",
    deviceClass: "temperature",
    unit: "°C",
    history: dailyCurve(22.1, 1.1, 19),
  }),
  entity({
    id: "sensor.kitchen_humidity",
    name: "Humidity",
    areaId: "kitchen",
    state: "51",
    deviceClass: "humidity",
    unit: "%",
    history: dailyCurve(51, 4, 19),
  }),
  entity({
    id: "light.office_desk",
    name: "Desk light",
    areaId: "office",
    state: "on",
    changedMinutesAgo: 32,
    attributes: {
      brightness: 64,
      rgbColor: [100, 160, 255],
      colorMode: "rgb",
      colorModes: ["rgb", "color_temp"],
      minColorTempKelvin: 2200,
      maxColorTempKelvin: 6500,
    },
  }),
  entity({
    id: "fan.office",
    name: "Desk fan",
    areaId: "office",
    state: "on",
    changedMinutesAgo: 18,
    attributes: { supportedFeatures: 1, percentage: 40, percentageStep: 10 },
  }),
  entity({
    id: "switch.office_monitor",
    name: "Monitor",
    areaId: "office",
    state: "on",
    changedMinutesAgo: 76,
  }),
  entity({
    id: "sensor.office_temperature",
    name: "Temperature",
    areaId: "office",
    state: "21.3",
    deviceClass: "temperature",
    unit: "°C",
    history: dailyCurve(21.3, 0.7),
  }),
  entity({
    id: "sensor.office_humidity",
    name: "Humidity",
    areaId: "office",
    state: "43",
    deviceClass: "humidity",
    unit: "%",
    history: dailyCurve(43, 2),
  }),
  entity({
    id: "light.bedroom_lamp",
    name: "Bedside lamp",
    areaId: "bedroom",
    state: "off",
    changedMinutesAgo: 135,
    attributes: {
      brightness: 35,
      colorTempKelvin: 2700,
      colorMode: "color_temp",
      colorModes: ["color_temp"],
      minColorTempKelvin: 2200,
      maxColorTempKelvin: 6500,
    },
  }),
  entity({
    id: "cover.bedroom_blinds",
    name: "Blinds",
    areaId: "bedroom",
    state: "open",
    changedMinutesAgo: 96,
    attributes: { supportedFeatures: 1 | 2 | 4 | 8, position: 45 },
  }),
  entity({
    id: "climate.bedroom",
    name: "Thermostat",
    areaId: "bedroom",
    state: "heat",
    unit: "°C",
    changedMinutesAgo: 75,
    attributes: {
      currentTemperature: 19.4,
      supportedFeatures: 17,
      targetTemperature: 20,
      minTemperature: 7,
      maxTemperature: 30,
      temperatureStep: 0.5,
      hvacModes: ["off", "heat", "auto"],
      hvacAction: "heating",
      presetMode: "eco",
      presetModes: ["eco", "comfort", "away"],
    },
  }),
  entity({
    id: "sensor.bedroom_temperature",
    name: "Temperature",
    areaId: "bedroom",
    state: "19.4",
    deviceClass: "temperature",
    unit: "°C",
    history: dailyCurve(19.4, 0.8),
  }),
  entity({
    id: "sensor.bedroom_humidity",
    name: "Humidity",
    areaId: "bedroom",
    state: "48",
    deviceClass: "humidity",
    unit: "%",
    history: dailyCurve(48, 3),
  }),
  entity({
    id: "lock.front_door",
    name: "Front door",
    areaId: "outside",
    state: "locked",
    changedMinutesAgo: 51,
    attributes: { batteryLevel: 84 },
  }),
  entity({
    id: "weather.home",
    name: "Home",
    areaId: "outside",
    state: "partlycloudy",
    unit: "°C",
    changedMinutesAgo: 10,
    attributes: {
      supportedFeatures: 1,
      currentTemperature: 14.2,
      humidity: 72,
      windSpeed: 12,
      windSpeedUnit: "km/h",
      forecast: forecastDays.map(([condition, temperatureHigh, temperatureLow, precipitationProbability], day) => ({
        time: now + day * 86_400_000,
        condition,
        temperatureHigh,
        temperatureLow,
        precipitationProbability,
      })),
    },
  }),
  entity({
    id: "sensor.outside_temperature",
    name: "Outside",
    areaId: "outside",
    state: "14.2",
    deviceClass: "temperature",
    unit: "°C",
    history: dailyCurve(14.2, 4.5),
  }),
];
