import type {
  SmartHomeArea,
  SmartHomeEntity,
  SmartHomeEntityAttributes,
  SmartHomeForecastDay,
} from "../../interfaces/smart-home/smart-home-types";

const now = Date.parse("2026-11-06T17:30:00Z");
const minutesAgo = (minutes: number) => now - minutes * 60_000;

const dailyCurve = (base: number, amplitude: number, peakHour = 15) => {
  const currentHour = new Date(now).getHours();
  return Array.from({ length: 24 }, (_, index) => {
    const hour = (currentHour - 23 + index + 24) % 24;
    const wave = Math.cos(((hour - peakHour) / 24) * Math.PI * 2);
    return Math.round((base + wave * amplitude) * 10) / 10;
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

export const mockSmartHomeAreas: SmartHomeArea[] = [
  {
    id: "living_room",
    name: "Living Room",
    floorId: "ground",
    icon: null,
    temperatureEntityId: "sensor.living_room_temperature",
    humidityEntityId: null,
  },
  {
    id: "kitchen",
    name: "Kitchen",
    floorId: "ground",
    icon: null,
    temperatureEntityId: "sensor.kitchen_temperature",
    humidityEntityId: null,
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
      mediaTitle: "Big Buck Bunny",
      mediaSource: "Jellyfin",
      volume: 0.32,
      isMuted: false,
      mediaDuration: 596,
      mediaPosition: 120,
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
    history: dailyCurve(20.4, 0.9),
  }),
  entity({
    id: "cover.living_room_blinds",
    name: "Blinds",
    areaId: "living_room",
    state: "open",
    deviceClass: "blind",
    changedMinutesAgo: 480,
    attributes: { position: 70 },
  }),
  entity({
    id: "scene.movie_night",
    name: "Movie night",
    areaId: "living_room",
    state: "2026-11-05T20:31:00+00:00",
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
    id: "sensor.kitchen_temperature",
    name: "Temperature",
    areaId: "kitchen",
    state: "22.1",
    deviceClass: "temperature",
    unit: "°C",
    history: dailyCurve(21.8, 1.1, 19),
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
    history: dailyCurve(11, 4.5),
  }),
];
