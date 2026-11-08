import type {
  SmartHomeArea,
  SmartHomeEntity,
  SmartHomeEntityAttributes,
  SmartHomeForecastDay,
} from "../../interfaces/smart-home/smart-home-types";

const now = Date.parse("2026-11-06T17:30:00Z");
const minutesAgo = (minutes: number) => now - minutes * 60_000;

const seeded = (seed: number) => {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
};

const dailyCurve = (seed: number, base: number, amplitude: number, noise: number, peakHour = 15) => {
  const random = seeded(seed);
  const currentHour = new Date(now).getHours();
  return Array.from({ length: 24 }, (_, index) => {
    const hour = (currentHour - 23 + index + 24) % 24;
    const wave = Math.cos(((hour - peakHour) / 24) * Math.PI * 2);
    return Math.round((base + wave * amplitude + (random() - 0.5) * noise) * 10) / 10;
  });
};

const spiky = (seed: number, idle: number, peak: number, activeHours: number[]) => {
  const random = seeded(seed);
  const currentHour = new Date(now).getHours();
  return Array.from({ length: 24 }, (_, index) => {
    const hour = (currentHour - 23 + index + 24) % 24;
    const active = activeHours.includes(hour);
    return Math.round((active ? peak * (0.7 + random() * 0.3) : idle * (0.6 + random() * 0.8)) * 10) / 10;
  });
};

const artwork = (from: string, to: string, label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="300" height="300" fill="url(#g)"/><circle cx="210" cy="90" r="60" fill="rgba(255,255,255,0.18)"/><circle cx="90" cy="220" r="90" fill="rgba(0,0,0,0.15)"/><text x="24" y="276" font-family="Helvetica,Arial" font-size="28" font-weight="700" fill="rgba(255,255,255,0.85)">${label}</text></svg>`,
  )}`;

const snapshot = (sky: string, ground: string, label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky}"/><stop offset="1" stop-color="${ground}"/></linearGradient></defs><rect width="640" height="360" fill="url(#s)"/><rect x="0" y="230" width="640" height="130" fill="rgba(30,30,30,0.55)"/><rect x="240" y="110" width="160" height="150" fill="rgba(60,50,40,0.85)"/><rect x="295" y="170" width="50" height="90" fill="rgba(20,20,20,0.9)"/><polygon points="220,115 320,50 420,115" fill="rgba(80,60,50,0.9)"/><rect x="60" y="180" width="18" height="70" fill="rgba(20,40,20,0.9)"/><circle cx="69" cy="165" r="38" fill="rgba(30,70,40,0.9)"/><text x="16" y="28" font-family="monospace" font-size="16" fill="rgba(255,255,255,0.9)">${label}</text><text x="470" y="28" font-family="monospace" font-size="16" fill="rgba(255,255,255,0.9)">● REC</text></svg>`,
  )}`;

interface EntityInput {
  id: string;
  name: string;
  areaId: string | null;
  state: string;
  icon?: string;
  deviceClass?: string;
  unit?: string;
  changedMinutesAgo?: number;
  stateClass?: string;
  attributes?: SmartHomeEntityAttributes & {
    forecast?: SmartHomeForecastDay[];
    snapshotUrl?: string;
    artworkUrl?: string;
  };
  history?: number[];
}

export const mockSmartHomeHistory = new Map<string, number[]>();
export const mockSmartHomeForecasts = new Map<string, SmartHomeForecastDay[]>();

const entity = (input: EntityInput): SmartHomeEntity => {
  const { forecast, snapshotUrl, artworkUrl, ...attributes } = input.attributes ?? {};
  if (input.history) mockSmartHomeHistory.set(input.id, input.history);
  if (forecast) mockSmartHomeForecasts.set(input.id, forecast);
  const changedAt = minutesAgo(input.changedMinutesAgo ?? 42);
  const pictureUrl = snapshotUrl ?? artworkUrl;
  return {
    id: input.id,
    domain: input.id.split(".")[0] ?? input.id,
    name: input.name,
    areaId: input.areaId,
    state: input.state,
    icon: input.icon ?? null,
    deviceClass: input.deviceClass ?? null,
    stateClass: input.stateClass ?? (input.history ? "measurement" : null),
    unit: input.unit ?? null,
    lastChanged: changedAt,
    lastUpdated: changedAt,
    attributes: pictureUrl ? { ...attributes, pictureUrl } : attributes,
  };
};

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
    humidityEntityId: null,
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
    id: "office",
    name: "Office",
    floorId: "first",
    icon: null,
    temperatureEntityId: "sensor.office_temperature",
    humidityEntityId: null,
  },
  {
    id: "garage",
    name: "Garage",
    floorId: "ground",
    icon: null,
    temperatureEntityId: null,
    humidityEntityId: null,
  },
  {
    id: "outside",
    name: "Outside",
    floorId: null,
    icon: null,
    temperatureEntityId: "sensor.outside_temperature",
    humidityEntityId: "sensor.outside_humidity",
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
    id: "light.tv_backlight",
    name: "TV backlight",
    areaId: "living_room",
    state: "off",
    icon: "mdi:led-strip-variant",
    changedMinutesAgo: 380,
    attributes: { brightness: 0, rgbColor: [120, 90, 255], colorModes: ["rgb"] },
  }),
  entity({
    id: "media_player.living_room_tv",
    name: "Living Room TV",
    areaId: "living_room",
    state: "playing",
    deviceClass: "tv",
    changedMinutesAgo: 51,
    attributes: {
      mediaTitle: "Dune: Part Two",
      mediaArtist: "Denis Villeneuve",
      mediaSource: "Plex",
      artworkUrl: artwork("#c2752f", "#3b1d0e", "DUNE"),
      volume: 0.32,
      isMuted: false,
      mediaDuration: 9960,
      mediaPosition: 3120,
    },
  }),
  entity({
    id: "media_player.sonos_living_room",
    name: "Sonos Arc",
    areaId: "living_room",
    state: "paused",
    deviceClass: "speaker",
    changedMinutesAgo: 120,
    attributes: {
      mediaTitle: "Midnight City",
      mediaArtist: "M83",
      mediaAlbum: "Hurry Up, We're Dreaming",
      mediaSource: "Spotify",
      artworkUrl: artwork("#7b4bff", "#ff4f9a", "M83"),
      volume: 0.45,
      isMuted: false,
      mediaDuration: 243,
      mediaPosition: 87,
    },
  }),
  entity({
    id: "climate.living_room",
    name: "Thermostat",
    areaId: "living_room",
    state: "heat",
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
      presetModes: ["eco", "comfort", "away", "boost"],
      currentHumidity: 44,
    },
    unit: "°C",
  }),
  entity({
    id: "sensor.living_room_temperature",
    name: "Temperature",
    areaId: "living_room",
    state: "20.5",
    deviceClass: "temperature",
    unit: "°C",
    history: dailyCurve(1, 20.4, 0.9, 0.4),
  }),
  entity({
    id: "sensor.living_room_humidity",
    name: "Humidity",
    areaId: "living_room",
    state: "44",
    deviceClass: "humidity",
    unit: "%",
    history: dailyCurve(2, 46, 4, 2, 6),
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
    id: "fan.living_room_fan",
    name: "Ceiling fan",
    areaId: "living_room",
    state: "off",
    changedMinutesAgo: 1440,
    attributes: { percentage: 0, presetModes: ["auto", "sleep", "breeze"] },
  }),
  entity({
    id: "binary_sensor.living_room_motion",
    name: "Motion",
    areaId: "living_room",
    state: "on",
    deviceClass: "motion",
    changedMinutesAgo: 2,
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
    id: "light.kitchen_island",
    name: "Island pendants",
    areaId: "kitchen",
    state: "on",
    changedMinutesAgo: 33,
    attributes: {
      brightness: 90,
      colorTempKelvin: 4000,
      colorMode: "color_temp",
      colorModes: ["color_temp"],
      minColorTempKelvin: 2700,
      maxColorTempKelvin: 6500,
    },
  }),
  entity({
    id: "light.kitchen_cabinets",
    name: "Under-cabinet",
    areaId: "kitchen",
    state: "off",
    icon: "mdi:led-strip",
    changedMinutesAgo: 210,
    attributes: { brightness: 0, colorModes: ["brightness"] },
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
    history: dailyCurve(3, 21.8, 1.1, 0.5, 19),
  }),
  entity({
    id: "binary_sensor.fridge_door",
    name: "Fridge door",
    areaId: "kitchen",
    state: "off",
    deviceClass: "door",
    changedMinutesAgo: 18,
  }),
  entity({
    id: "binary_sensor.kitchen_leak",
    name: "Sink leak",
    areaId: "kitchen",
    state: "off",
    deviceClass: "moisture",
    changedMinutesAgo: 9000,
  }),
  entity({
    id: "sensor.dishwasher_status",
    name: "Dishwasher",
    areaId: "kitchen",
    state: "drying",
    deviceClass: "enum",
    icon: "mdi:dishwasher",
    changedMinutesAgo: 22,
  }),
  entity({
    id: "vacuum.roborock",
    name: "Roborock S8",
    areaId: "kitchen",
    state: "cleaning",
    changedMinutesAgo: 14,
    attributes: { batteryLevel: 72, status: "Cleaning kitchen" },
  }),
  entity({
    id: "light.bedroom_ceiling",
    name: "Ceiling light",
    areaId: "bedroom",
    state: "off",
    changedMinutesAgo: 600,
    attributes: { brightness: 0, colorModes: ["brightness"] },
  }),
  entity({
    id: "light.bedside",
    name: "Bedside lamp",
    areaId: "bedroom",
    state: "on",
    icon: "mdi:lamp",
    changedMinutesAgo: 7,
    attributes: {
      brightness: 25,
      colorTempKelvin: 2400,
      colorMode: "color_temp",
      colorModes: ["color_temp"],
      minColorTempKelvin: 2200,
      maxColorTempKelvin: 6500,
    },
  }),
  entity({
    id: "cover.bedroom_shutter",
    name: "Shutter",
    areaId: "bedroom",
    state: "closed",
    deviceClass: "shutter",
    changedMinutesAgo: 120,
    attributes: { position: 0 },
  }),
  entity({
    id: "climate.bedroom_ac",
    name: "Air conditioner",
    areaId: "bedroom",
    state: "cool",
    changedMinutesAgo: 75,
    unit: "°C",
    attributes: {
      currentTemperature: 23.4,
      targetTemperature: 19,
      supportedFeatures: 17,
      minTemperature: 16,
      maxTemperature: 30,
      temperatureStep: 1,
      hvacModes: ["off", "cool", "dry", "fan_only"],
      hvacAction: "cooling",
      presetMode: "sleep",
      presetModes: ["none", "sleep", "eco"],
    },
  }),
  entity({
    id: "sensor.bedroom_temperature",
    name: "Temperature",
    areaId: "bedroom",
    state: "21.0",
    deviceClass: "temperature",
    unit: "°C",
    history: dailyCurve(4, 21.2, 1.4, 0.3, 17),
  }),
  entity({
    id: "sensor.bedroom_humidity",
    name: "Humidity",
    areaId: "bedroom",
    state: "51",
    deviceClass: "humidity",
    unit: "%",
    history: dailyCurve(5, 50, 3, 2, 5),
  }),
  entity({
    id: "sensor.bedroom_co2",
    name: "CO₂",
    areaId: "bedroom",
    state: "612",
    deviceClass: "carbon_dioxide",
    unit: "ppm",
    history: dailyCurve(6, 700, 260, 60, 4),
  }),
  entity({
    id: "humidifier.bedroom",
    name: "Humidifier",
    areaId: "bedroom",
    state: "on",
    changedMinutesAgo: 240,
    attributes: { targetHumidity: 45, currentHumidity: 51 },
  }),
  entity({
    id: "light.office_desk",
    name: "Desk lamp",
    areaId: "office",
    state: "on",
    changedMinutesAgo: 180,
    attributes: {
      brightness: 100,
      colorTempKelvin: 5000,
      colorMode: "color_temp",
      colorModes: ["color_temp"],
      minColorTempKelvin: 2700,
      maxColorTempKelvin: 6500,
    },
  }),
  entity({
    id: "switch.office_monitors",
    name: "Monitors",
    areaId: "office",
    state: "on",
    icon: "mdi:monitor-multiple",
    changedMinutesAgo: 181,
  }),
  entity({
    id: "sensor.office_power",
    name: "Desk power",
    areaId: "office",
    state: "182",
    deviceClass: "power",
    unit: "W",
    history: spiky(7, 12, 210, [9, 10, 11, 12, 14, 15, 16, 17, 18]),
  }),
  entity({
    id: "sensor.office_temperature",
    name: "Temperature",
    areaId: "office",
    state: "23.2",
    deviceClass: "temperature",
    unit: "°C",
    history: dailyCurve(8, 22.4, 1.2, 0.4, 16),
  }),
  entity({
    id: "media_player.office_speaker",
    name: "Office speaker",
    areaId: "office",
    state: "idle",
    deviceClass: "speaker",
    changedMinutesAgo: 400,
    attributes: { volume: 0.2, mediaSource: "AirPlay" },
  }),
  entity({
    id: "binary_sensor.office_window",
    name: "Window",
    areaId: "office",
    state: "on",
    deviceClass: "window",
    changedMinutesAgo: 26,
  }),
  entity({
    id: "cover.garage_door",
    name: "Garage door",
    areaId: "garage",
    state: "closed",
    deviceClass: "garage",
    changedMinutesAgo: 205,
    attributes: { position: 0 },
  }),
  entity({
    id: "lock.garage_side_door",
    name: "Side door",
    areaId: "garage",
    state: "locked",
    changedMinutesAgo: 205,
    attributes: { batteryLevel: 61 },
  }),
  entity({
    id: "switch.ev_charger",
    name: "EV charger",
    areaId: "garage",
    state: "on",
    icon: "mdi:ev-station",
    changedMinutesAgo: 140,
  }),
  entity({
    id: "sensor.ev_battery",
    name: "Car battery",
    areaId: "garage",
    state: "64",
    deviceClass: "battery",
    unit: "%",
    history: [22, 22, 22, 22, 22, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 28, 37, 46, 55, 64],
  }),
  entity({
    id: "sensor.ev_charging_power",
    name: "Charging power",
    areaId: "garage",
    state: "7.2",
    deviceClass: "power",
    unit: "kW",
    history: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7.1, 7.3, 7.2, 7.2, 7.2],
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
    id: "lock.back_door",
    name: "Back door",
    areaId: "outside",
    state: "unlocked",
    changedMinutesAgo: 16,
    attributes: { batteryLevel: 18 },
  }),
  entity({
    id: "alarm_control_panel.home_alarm",
    name: "Home alarm",
    areaId: null,
    state: "armed_home",
    changedMinutesAgo: 51,
    attributes: { codeRequired: true },
  }),
  entity({
    id: "camera.front_door",
    name: "Front door",
    areaId: "outside",
    state: "recording",
    changedMinutesAgo: 3,
    attributes: { snapshotUrl: snapshot("#8fb3d9", "#d9c7a7", "FRONT DOOR") },
  }),
  entity({
    id: "camera.driveway",
    name: "Driveway",
    areaId: "outside",
    state: "idle",
    changedMinutesAgo: 30,
    attributes: { snapshotUrl: snapshot("#2b3a55", "#4a4a4a", "DRIVEWAY") },
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
      forecast: [
        {
          time: now,
          condition: "partlycloudy",
          temperatureHigh: 15,
          temperatureLow: 8,
          precipitationProbability: 10,
        },
        {
          time: now + 1 * 86_400_000,
          condition: "rainy",
          temperatureHigh: 12,
          temperatureLow: 7,
          precipitationProbability: 80,
        },
        {
          time: now + 2 * 86_400_000,
          condition: "cloudy",
          temperatureHigh: 11,
          temperatureLow: 6,
          precipitationProbability: 30,
        },
        {
          time: now + 3 * 86_400_000,
          condition: "sunny",
          temperatureHigh: 14,
          temperatureLow: 5,
          precipitationProbability: 0,
        },
        {
          time: now + 4 * 86_400_000,
          condition: "sunny",
          temperatureHigh: 16,
          temperatureLow: 7,
          precipitationProbability: 5,
        },
      ],
    },
  }),
  entity({
    id: "sensor.outside_temperature",
    name: "Outside",
    areaId: "outside",
    state: "14.2",
    deviceClass: "temperature",
    unit: "°C",
    history: dailyCurve(9, 11, 4.5, 0.6, 15),
  }),
  entity({
    id: "sensor.outside_humidity",
    name: "Outside humidity",
    areaId: "outside",
    state: "72",
    deviceClass: "humidity",
    unit: "%",
    history: dailyCurve(10, 75, 10, 3, 5),
  }),
  entity({
    id: "sun.sun",
    name: "Sun",
    areaId: "outside",
    state: "above_horizon",
    changedMinutesAgo: 560,
    attributes: { nextSetting: now + 95 * 60_000, nextRising: now + 15 * 3_600_000 },
  }),
  entity({
    id: "valve.garden_irrigation",
    name: "Garden irrigation",
    areaId: "outside",
    state: "closed",
    deviceClass: "water",
    changedMinutesAgo: 900,
    attributes: { position: 0 },
  }),
  entity({
    id: "person.thomas",
    name: "Thomas",
    areaId: null,
    state: "home",
    changedMinutesAgo: 95,
    attributes: { zone: "Home" },
  }),
  entity({
    id: "person.alex",
    name: "Alex",
    areaId: null,
    state: "not_home",
    changedMinutesAgo: 310,
    attributes: { zone: "Work" },
  }),
  entity({
    id: "person.sam",
    name: "Sam",
    areaId: null,
    state: "home",
    changedMinutesAgo: 20,
    attributes: { zone: "Home" },
  }),
  entity({
    id: "sensor.energy_today",
    name: "Energy today",
    areaId: null,
    state: "12.4",
    deviceClass: "energy",
    unit: "kWh",
    history: [
      0.2, 0.4, 0.5, 0.7, 0.8, 1, 1.3, 1.9, 2.6, 3.1, 3.7, 4.2, 4.8, 5.5, 6.1, 6.8, 7.6, 8.3, 9.1, 9.9, 10.8, 11.5,
      12.1, 12.4,
    ],
  }),
  entity({
    id: "sensor.solar_power",
    name: "Solar",
    areaId: null,
    state: "2.3",
    deviceClass: "power",
    unit: "kW",
    history: dailyCurve(11, 1.4, 1.6, 0.3, 13).map((value) => Math.max(0, value)),
  }),
  entity({
    id: "sensor.grid_power",
    name: "Grid",
    areaId: null,
    state: "-0.8",
    deviceClass: "power",
    unit: "kW",
    history: dailyCurve(12, 0.3, 1.1, 0.4, 2),
  }),
  entity({
    id: "update.home_assistant_core",
    name: "Home Assistant Core",
    areaId: null,
    state: "on",
    changedMinutesAgo: 2000,
    attributes: {
      installedVersion: "2026.11.1",
      latestVersion: "2026.11.2",
      releaseSummary: "Bugfix release: Matter, ZHA and Shelly fixes.",
    },
  }),
  entity({
    id: "input_boolean.guest_mode",
    name: "Guest mode",
    areaId: null,
    state: "off",
    icon: "mdi:account-group",
    changedMinutesAgo: 4000,
  }),
  entity({
    id: "input_select.house_mode",
    name: "House mode",
    areaId: null,
    state: "Home",
    icon: "mdi:home-switch",
    changedMinutesAgo: 95,
    attributes: { options: ["Home", "Away", "Night", "Vacation"] },
  }),
  entity({
    id: "scene.relax",
    name: "Relax",
    areaId: "living_room",
    state: "2026-11-04T19:02:00+00:00",
    icon: "mdi:sofa",
    changedMinutesAgo: 2600,
  }),
  entity({
    id: "scene.good_morning",
    name: "Good morning",
    areaId: "bedroom",
    state: "2026-11-06T06:45:00+00:00",
    icon: "mdi:weather-sunset-up",
    changedMinutesAgo: 600,
  }),
  entity({
    id: "script.goodnight",
    name: "Goodnight",
    areaId: null,
    state: "off",
    icon: "mdi:weather-night",
    changedMinutesAgo: 1100,
    attributes: { lastTriggered: minutesAgo(1100) },
  }),
  entity({
    id: "script.leave_home",
    name: "Leave home",
    areaId: null,
    state: "off",
    icon: "mdi:exit-run",
    changedMinutesAgo: 3000,
    attributes: { lastTriggered: minutesAgo(3000) },
  }),
  entity({
    id: "automation.porch_light_sunset",
    name: "Porch light at sunset",
    areaId: "outside",
    state: "on",
    changedMinutesAgo: 1300,
    attributes: { lastTriggered: minutesAgo(1300) },
  }),
  entity({
    id: "automation.garage_left_open",
    name: "Garage left open alert",
    areaId: "garage",
    state: "on",
    changedMinutesAgo: 9000,
    attributes: { lastTriggered: minutesAgo(4300) },
  }),
  entity({
    id: "automation.morning_blinds",
    name: "Morning blinds",
    areaId: "living_room",
    state: "off",
    changedMinutesAgo: 20000,
    attributes: { lastTriggered: minutesAgo(20000) },
  }),
  entity({
    id: "button.restart_router",
    name: "Restart router",
    areaId: "office",
    state: "2026-10-30T08:10:00+00:00",
    deviceClass: "restart",
    changedMinutesAgo: 10000,
  }),
  entity({
    id: "sensor.washing_machine",
    name: "Washing machine",
    areaId: null,
    state: "unavailable",
    icon: "mdi:washing-machine",
    changedMinutesAgo: 75,
  }),
];
