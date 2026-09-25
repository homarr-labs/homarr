import { afterEach, describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";

const mocks = vi.hoisted(() => ({
  getDataAsync: vi.fn(),
  handler: vi.fn(),
  env: { NO_EXTERNAL_CONNECTION: false },
}));

vi.mock("@homarr/common/env", () => ({
  env: mocks.env,
}));

vi.mock("@homarr/request-handler/weather", () => ({
  weatherRequestHandler: {
    handler: mocks.handler,
  },
}));

import { weatherRouter } from "../../widgets/weather";

const weatherData = {
  current: { weathercode: 0, temperature: 20, windspeed: 10 },
  daily: [],
};

const createCaller = () => weatherRouter.createCaller({ db: createDb(), deviceType: undefined, session: null });

afterEach(() => {
  mocks.env.NO_EXTERNAL_CONNECTION = false;
  mocks.handler.mockReset();
  mocks.getDataAsync.mockReset();
});

describe("weatherRouter.atLocation", () => {
  test("should return null when external connections are disabled", async () => {
    // Arrange
    mocks.env.NO_EXTERNAL_CONNECTION = true;
    const caller = createCaller();

    // Act
    const result = await caller.atLocation({ latitude: 48.85341, longitude: 2.3488 });

    // Assert
    expect(result).toBeNull();
    expect(mocks.handler).not.toHaveBeenCalled();
  });

  test("should return the weather data when external connections are enabled", async () => {
    // Arrange
    mocks.env.NO_EXTERNAL_CONNECTION = false;
    mocks.handler.mockReturnValue({ getDataAsync: mocks.getDataAsync });
    mocks.getDataAsync.mockResolvedValue({ data: weatherData, timestamp: new Date() });
    const caller = createCaller();

    // Act
    const result = await caller.atLocation({ latitude: 48.85341, longitude: 2.3488 });

    // Assert
    expect(result).toEqual(weatherData);
    expect(mocks.handler).toHaveBeenCalledWith({ latitude: 48.85341, longitude: 2.3488 });
  });
});
