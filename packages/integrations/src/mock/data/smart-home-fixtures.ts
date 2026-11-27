import type {
  SmartHomeArea,
  SmartHomeEntity,
  SmartHomeEntityAttributes,
  SmartHomeEntityDevice,
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
  device?: SmartHomeEntityDevice;
}

// A drawn front door in the evening, as the mock camera's snapshot.
const mockCameraPicture = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f2a44"/><stop offset="1" stop-color="#46527a"/></linearGradient></defs>
    <rect width="320" height="180" fill="url(#sky)"/>
    <rect y="132" width="320" height="48" fill="#2b2f36"/>
    <rect x="96" y="44" width="128" height="96" fill="#6b5a4a"/>
    <rect x="140" y="78" width="40" height="62" rx="3" fill="#3a2c22"/>
    <circle cx="172" cy="112" r="2.5" fill="#e3c46b"/>
    <rect x="108" y="62" width="22" height="20" fill="#f2d27a" opacity="0.85"/>
    <rect x="190" y="62" width="22" height="20" fill="#f2d27a" opacity="0.6"/>
    <polygon points="88,48 160,10 232,48" fill="#4a3a30"/>
    <text x="10" y="20" font-family="monospace" font-size="11" fill="#fff" opacity="0.8">FRONT DOOR · REC</text>
  </svg>`,
)}`;

// The mock 3D printer's chamber camera: a drawn printer, no real picture.
const mockPrinterPicture = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
    <rect width="320" height="180" fill="#1b1d22"/>
    <rect x="40" y="24" width="240" height="8" rx="2" fill="#4b5058"/>
    <rect x="132" y="32" width="56" height="30" rx="4" fill="#2f3339"/>
    <polygon points="152,62 168,62 162,74 158,74" fill="#c8ccd2"/>
    <rect x="70" y="140" width="180" height="10" rx="2" fill="#3c4148"/>
    <path d="M128 140 h64 v-14 h-6 v-10 h-10 v-12 h-32 v12 h-10 v10 h-6 z" fill="#f08c2e"/>
    <text x="10" y="172" font-family="monospace" font-size="11" fill="#fff" opacity="0.8">P1S · CHAMBER</text>
  </svg>`,
)}`;

const printer: SmartHomeEntityDevice = { id: "bambu_p1s", name: "P1S", entityName: null, model: "Bambu Lab P1S" };
const printerPart = (entityName: string): SmartHomeEntityDevice => ({ ...printer, entityName });
const printStatusOptions = [
  "failed",
  "finish",
  "idle",
  "init",
  "offline",
  "pause",
  "prepare",
  "running",
  "slicing",
  "unknown",
];

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
    device: input.device ?? null,
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
    // A camera with a built-in picture, so demo boards can show camera elements without a real camera or network.
    id: "camera.front_door",
    name: "Front Door",
    areaId: "living_room",
    state: "idle",
    changedMinutesAgo: 1,
    attributes: { pictureUrl: mockCameraPicture },
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
  // A Bambu Lab P1S as the ha-bambulab integration reports it, in the middle of a print.
  entity({
    id: "camera.p1s_camera",
    name: "P1S Camera",
    areaId: "office",
    state: "idle",
    changedMinutesAgo: 1,
    attributes: { pictureUrl: mockPrinterPicture },
    device: printerPart("Camera"),
  }),
  entity({
    id: "sensor.p1s_print_progress",
    name: "P1S Print progress",
    areaId: "office",
    state: "42",
    unit: "%",
    changedMinutesAgo: 1,
    device: printerPart("Print progress"),
  }),
  entity({
    id: "sensor.p1s_print_status",
    name: "P1S Print status",
    areaId: "office",
    state: "running",
    deviceClass: "enum",
    changedMinutesAgo: 70,
    attributes: { options: printStatusOptions },
    device: printerPart("Print status"),
  }),
  entity({
    id: "sensor.p1s_current_stage",
    name: "P1S Current stage",
    areaId: "office",
    state: "printing",
    deviceClass: "enum",
    changedMinutesAgo: 62,
    device: printerPart("Current stage"),
  }),
  entity({
    // ha-bambulab reports minutes and suggests hours, so Home Assistant sends hours.
    id: "sensor.p1s_remaining_time",
    name: "P1S Remaining time",
    areaId: "office",
    state: "1.583",
    deviceClass: "duration",
    unit: "h",
    changedMinutesAgo: 1,
    device: printerPart("Remaining time"),
  }),
  entity({
    id: "sensor.p1s_end_time",
    name: "P1S End time",
    areaId: "office",
    state: new Date(now + 95 * 60_000).toISOString(),
    deviceClass: "timestamp",
    changedMinutesAgo: 1,
    device: printerPart("End time"),
  }),
  entity({
    id: "sensor.p1s_current_layer",
    name: "P1S Current layer",
    areaId: "office",
    state: "57",
    changedMinutesAgo: 1,
    device: printerPart("Current layer"),
  }),
  entity({
    id: "sensor.p1s_nozzle_temperature",
    name: "P1S Nozzle temperature",
    areaId: "office",
    state: "219.8",
    deviceClass: "temperature",
    unit: "°C",
    changedMinutesAgo: 1,
    device: printerPart("Nozzle temperature"),
  }),
  entity({
    id: "sensor.p1s_nozzle_target_temperature",
    name: "P1S Nozzle target temperature",
    areaId: "office",
    state: "220",
    deviceClass: "temperature",
    unit: "°C",
    changedMinutesAgo: 70,
    device: printerPart("Nozzle target temperature"),
  }),
  entity({
    id: "sensor.p1s_bed_temperature",
    name: "P1S Bed temperature",
    areaId: "office",
    state: "65.1",
    deviceClass: "temperature",
    unit: "°C",
    changedMinutesAgo: 1,
    device: printerPart("Bed temperature"),
  }),
  entity({
    id: "light.p1s_chamber_light",
    name: "P1S Chamber light",
    areaId: "office",
    state: "on",
    changedMinutesAgo: 70,
    attributes: { colorModes: ["onoff"], colorMode: "onoff" },
    device: printerPart("Chamber light"),
  }),
  entity({
    // Never pressed: Home Assistant reports "unknown" until a button is used.
    id: "button.p1s_pause_printing",
    name: "P1S Pause printing",
    areaId: "office",
    state: "unknown",
    changedMinutesAgo: 70,
    device: printerPart("Pause printing"),
  }),
  entity({
    // Only available while a print is paused.
    id: "button.p1s_resume_printing",
    name: "P1S Resume printing",
    areaId: "office",
    state: "unavailable",
    changedMinutesAgo: 70,
    device: printerPart("Resume printing"),
  }),
  entity({
    id: "button.p1s_stop_printing",
    name: "P1S Stop printing",
    areaId: "office",
    state: "unknown",
    changedMinutesAgo: 70,
    device: printerPart("Stop printing"),
  }),
  entity({
    id: "select.p1s_printing_speed",
    name: "P1S Printing speed",
    areaId: "office",
    state: "standard",
    changedMinutesAgo: 70,
    attributes: { options: ["silent", "standard", "sport", "ludicrous"] },
    device: printerPart("Printing speed"),
  }),
];
