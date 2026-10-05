import { describe, expect, it } from "vitest";

import {
  getAqiCategory,
  getAqiStandard,
  getCompactAirQualityLayout,
  getDominantPollutant,
  getStrongestPollen,
} from "./display";

const point = {
  observedAt: "2026-07-01T10:00:00.000Z",
  europeanAqi: 42,
  usAqi: 60,
  uvIndex: 4,
  pollutants: { pm2_5: 12, pm10: 20, ozone: 30, nitrogenDioxide: 4, sulphurDioxide: 3, carbonMonoxide: 100 },
  europeanSubIndices: {
    pm2_5: 20,
    pm10: 31,
    ozone: 42,
    nitrogenDioxide: 10,
    sulphurDioxide: 5,
    carbonMonoxide: null,
  },
  usSubIndices: {
    pm2_5: 50,
    pm10: 40,
    ozone: 30,
    nitrogenDioxide: 20,
    sulphurDioxide: 10,
    carbonMonoxide: 60,
  },
  pollen: { alder: null, birch: 12, grass: 20, mugwort: 5, olive: null, ragweed: 2 },
};

describe("air quality display", () => {
  it("uses the US scale only for US locales in automatic mode", () => {
    expect(getAqiStandard("auto", "en-US")).toBe("us");
    expect(getAqiStandard("auto", "fr-FR")).toBe("european");
    expect(getAqiStandard("auto", "en")).toBe("european");
    expect(getAqiStandard("us", "fr-FR")).toBe("us");
  });

  it("uses the defined AQI band boundaries", () => {
    expect(getAqiCategory(20, "european")).toBe("good");
    expect(getAqiCategory(21, "european")).toBe("fair");
    expect(getAqiCategory(101, "european")).toBe("extremelyPoor");
    expect(getAqiCategory(50, "us")).toBe("good");
    expect(getAqiCategory(51, "us")).toBe("moderate");
    expect(getAqiCategory(301, "us")).toBe("hazardous");
  });

  it("finds dominant subindices and raw pollen without combining them", () => {
    expect(getDominantPollutant(point, "european")).toEqual({ key: "ozone", value: 42 });
    expect(getDominantPollutant(point, "us")).toEqual({ key: "carbonMonoxide", value: 60 });
    expect(getStrongestPollen(point)).toEqual({ key: "grass", value: 20 });
  });

  it("progressively reveals compact details", () => {
    expect(getCompactAirQualityLayout(149, 200)).toMatchObject({ tiny: true });
    expect(getCompactAirQualityLayout(250, 150)).toMatchObject({ showParticulatesAndPollen: true });
    expect(getCompactAirQualityLayout(300, 170)).toMatchObject({ showSparkline: true });
  });
});
