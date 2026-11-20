import type { SmartHomeAction } from "../interfaces/smart-home/smart-home-types";
import { getEntityDomain } from "./homeassistant-normalize";

export interface HomeAssistantServiceCall {
  domain: string;
  service: string;
  data: Record<string, unknown>;
}

const onOffDomains = new Set([
  "light",
  "switch",
  "fan",
  "input_boolean",
  "humidifier",
  "automation",
  "siren",
  "remote",
  "media_player",
  "climate",
  "water_heater",
  "script",
  "group",
]);

const toggleDomains = new Set([
  "light",
  "switch",
  "fan",
  "input_boolean",
  "humidifier",
  "automation",
  "siren",
  "remote",
  "media_player",
  "climate",
  "cover",
  "valve",
  "script",
  "group",
]);

const call = (domain: string, service: string, data: Record<string, unknown> = {}): HomeAssistantServiceCall => ({
  domain,
  service,
  data,
});

const withCode = (code: string | undefined) => (code ? { code } : {});

const resolveCall = (domain: string, action: SmartHomeAction): HomeAssistantServiceCall | null => {
  switch (action.type) {
    case "toggle":
      if (domain === "group") return call("homeassistant", "toggle");
      return toggleDomains.has(domain) ? call(domain, "toggle") : null;
    case "turnOn":
      if (domain === "group") return call("homeassistant", "turn_on");
      if (domain === "scene") return call("scene", "turn_on");
      return onOffDomains.has(domain) ? call(domain, "turn_on") : null;
    case "turnOff":
      if (domain === "group") return call("homeassistant", "turn_off");
      return onOffDomains.has(domain) ? call(domain, "turn_off") : null;
    case "setBrightness":
      if (domain !== "light") return null;
      if (action.value <= 0) return call("light", "turn_off");
      return call("light", "turn_on", { brightness_pct: clampNumber(action.value, 1, 100) });
    case "setColorTemp":
      return domain === "light" ? call("light", "turn_on", { color_temp_kelvin: Math.round(action.value) }) : null;
    case "setRgbColor":
      return domain === "light" ? call("light", "turn_on", { rgb_color: action.value }) : null;
    case "setEffect":
      return domain === "light" ? call("light", "turn_on", { effect: action.value }) : null;
    case "setTemperature":
      if (domain === "climate" || domain === "water_heater") {
        return call(domain, "set_temperature", { temperature: action.value });
      }
      return null;
    case "setTemperatureRange":
      return domain === "climate"
        ? call("climate", "set_temperature", { target_temp_low: action.low, target_temp_high: action.high })
        : null;
    case "setHvacMode":
      return domain === "climate" ? call("climate", "set_hvac_mode", { hvac_mode: action.value }) : null;
    case "setPresetMode":
      if (domain === "climate" || domain === "fan")
        return call(domain, "set_preset_mode", { preset_mode: action.value });
      return null;
    case "setFanMode":
      return domain === "climate" ? call("climate", "set_fan_mode", { fan_mode: action.value }) : null;
    case "setHumidity":
      if (domain === "humidifier" || domain === "climate")
        return call(domain, "set_humidity", { humidity: action.value });
      return null;
    case "setMode":
      if (domain === "humidifier") return call("humidifier", "set_mode", { mode: action.value });
      if (domain === "water_heater")
        return call("water_heater", "set_operation_mode", { operation_mode: action.value });
      return null;
    case "setPosition":
      if (domain === "cover")
        return call("cover", "set_cover_position", { position: clampNumber(action.value, 0, 100) });
      if (domain === "valve")
        return call("valve", "set_valve_position", { position: clampNumber(action.value, 0, 100) });
      return null;
    case "setTiltPosition":
      return domain === "cover"
        ? call("cover", "set_cover_tilt_position", { tilt_position: clampNumber(action.value, 0, 100) })
        : null;
    case "open":
      if (domain === "cover") return call("cover", "open_cover");
      if (domain === "valve") return call("valve", "open_valve");
      return null;
    case "close":
      if (domain === "cover") return call("cover", "close_cover");
      if (domain === "valve") return call("valve", "close_valve");
      return null;
    case "stop":
      if (domain === "cover") return call("cover", "stop_cover");
      if (domain === "valve") return call("valve", "stop_valve");
      return null;
    case "lock":
      return domain === "lock" ? call("lock", "lock", withCode(action.code)) : null;
    case "unlock":
      return domain === "lock" ? call("lock", "unlock", withCode(action.code)) : null;
    case "openLatch":
      return domain === "lock" ? call("lock", "open", withCode(action.code)) : null;
    case "mediaPlayPause":
      return domain === "media_player" ? call("media_player", "media_play_pause") : null;
    case "mediaPlay":
      return domain === "media_player" ? call("media_player", "media_play") : null;
    case "mediaPause":
      return domain === "media_player" ? call("media_player", "media_pause") : null;
    case "mediaNext":
      return domain === "media_player" ? call("media_player", "media_next_track") : null;
    case "mediaPrevious":
      return domain === "media_player" ? call("media_player", "media_previous_track") : null;
    case "setVolume":
      return domain === "media_player"
        ? call("media_player", "volume_set", { volume_level: clampNumber(action.value, 0, 1) })
        : null;
    case "setMuted":
      return domain === "media_player" ? call("media_player", "volume_mute", { is_volume_muted: action.value }) : null;
    case "selectSource":
      return domain === "media_player" ? call("media_player", "select_source", { source: action.value }) : null;
    case "trigger":
      if (domain === "scene") return call("scene", "turn_on");
      if (domain === "script") return call("script", "turn_on");
      if (domain === "automation") return call("automation", "trigger");
      if (domain === "button" || domain === "input_button") return call(domain, "press");
      return null;
    case "selectOption":
      if (domain === "input_select" || domain === "select")
        return call(domain, "select_option", { option: action.value });
      return null;
    case "setValue":
      if (domain === "input_number" || domain === "number") return call(domain, "set_value", { value: action.value });
      return null;
    case "setFanPercentage":
      return domain === "fan" ? call("fan", "set_percentage", { percentage: clampNumber(action.value, 0, 100) }) : null;
    case "setOscillating":
      return domain === "fan" ? call("fan", "oscillate", { oscillating: action.value }) : null;
    case "increment":
      if (domain === "counter" || domain === "input_number") return call(domain, "increment");
      return null;
    case "decrement":
      if (domain === "counter" || domain === "input_number") return call(domain, "decrement");
      return null;
    case "vacuumStart":
      if (domain === "vacuum") return call("vacuum", "start");
      if (domain === "lawn_mower") return call("lawn_mower", "start_mowing");
      return null;
    case "vacuumPause":
      if (domain === "vacuum" || domain === "lawn_mower") return call(domain, "pause");
      return null;
    case "vacuumReturn":
      if (domain === "vacuum") return call("vacuum", "return_to_base");
      if (domain === "lawn_mower") return call("lawn_mower", "dock");
      return null;
    case "vacuumLocate":
      return domain === "vacuum" ? call("vacuum", "locate") : null;
    case "alarmArm":
      return domain === "alarm_control_panel"
        ? call("alarm_control_panel", `alarm_arm_${action.mode}`, withCode(action.code))
        : null;
    case "alarmDisarm":
      return domain === "alarm_control_panel"
        ? call("alarm_control_panel", "alarm_disarm", withCode(action.code))
        : null;
    case "install":
      return domain === "update" ? call("update", "install") : null;
    case "timerStart":
      return domain === "timer" ? call("timer", "start") : null;
    case "timerPause":
      return domain === "timer" ? call("timer", "pause") : null;
    case "timerCancel":
      return domain === "timer" ? call("timer", "cancel") : null;
  }
};

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const toServiceCall = (entityId: string, action: SmartHomeAction): HomeAssistantServiceCall | null =>
  resolveCall(getEntityDomain(entityId), action);
