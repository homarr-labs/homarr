import { TRPCError } from "@trpc/server";
import { describe, expect, test, vi } from "vitest";

import type { RouterOutputs } from "@homarr/api";
import { api } from "@homarr/api/server";
import { objectKeys } from "@homarr/common";

import type { WidgetProps } from "../../definition";
import getServerDataAsync from "../serverData";

const mockApp = (override: Partial<RouterOutputs["app"]["byId"]>) =>
  ({
    id: "1",
    name: "Mock app",
    iconUrl: "https://some.com/icon.png",
    description: null,
    href: "https://google.ch",
    ...override,
  }) satisfies RouterOutputs["app"]["byId"];

vi.mock("@homarr/api/server", () => ({
  api: {
    app: {
      byId: () => null,
    },
    widget: {
      app: {
        ping: () => null,
      },
    },
  },
}));

describe("getServerDataAsync should load app and ping result", () => {
  test("when appId is empty it should return null for app and pingResult", async () => {
    // Arrange
    const options = {
      appId: "",
      pingEnabled: true,
    };

    // Act
    const result = await getServerDataAsync({ options } as unknown as WidgetProps<"app">);

    // Assert
    expect(result.app).toBeNull();
    expect(result.pingResult).toBeNull();
  });

  test("when app exists and ping is disabled it should return existing app and pingResult null", async () => {
    // Arrange
    const spy = vi.spyOn(api.app, "byId");
    const options = {
      appId: "1",
      pingEnabled: false,
    };
    const mockedApp = mockApp({});
    spy.mockImplementation(() => Promise.resolve(mockedApp));

    // Act
    const result = await getServerDataAsync({ options } as unknown as WidgetProps<"app">);

    // Assert
    expect(result.pingResult).toBeNull();
    objectKeys(mockedApp).forEach((key) => expect(result.app?.[key]).toBe(mockedApp[key]));
  });

  test("when app exists without href and ping enabled it should return existing app and pingResult null", async () => {
    // Arrange
    const spy = vi.spyOn(api.app, "byId");
    const options = {
      appId: "1",
      pingEnabled: true,
    };
    const mockedApp = mockApp({ href: null });
    spy.mockImplementation(() => Promise.resolve(mockedApp));

    // Act
    const result = await getServerDataAsync({ options } as unknown as WidgetProps<"app">);

    // Assert
    expect(result.pingResult).toBeNull();
    objectKeys(mockedApp).forEach((key) => expect(result.app?.[key]).toBe(mockedApp[key]));
  });

  test("when app does not exist it should return for both null", async () => {
    // Arrange
    const spy = vi.spyOn(api.app, "byId");
    const options = {
      appId: "1",
      pingEnabled: true,
    };
    spy.mockImplementation(() =>
      Promise.reject(
        new TRPCError({
          code: "NOT_FOUND",
        }),
      ),
    );

    // Act
    const result = await getServerDataAsync({ options } as unknown as WidgetProps<"app">);

    // Assert
    expect(result.pingResult).toBeNull();
    expect(result.app).toBeNull();
  });

  test("when app found and ping enabled it should return existing app and pingResult", async () => {
    // Arrange
    const spyById = vi.spyOn(api.app, "byId");
    const spyPing = vi.spyOn(api.widget.app, "ping");
    const options = {
      appId: "1",
      pingEnabled: true,
    };
    const mockedApp = mockApp({});
    const pingResult = { statusCode: 200, url: "http://localhost" };
    spyById.mockImplementation(() => Promise.resolve(mockedApp));
    spyPing.mockImplementation(() => Promise.resolve(pingResult));

    // Act
    const result = await getServerDataAsync({ options } as unknown as WidgetProps<"app">);

    // Assert
    expect(result.pingResult).toBe(pingResult);
    expect(result.app).toBe(mockedApp);
  });
});
