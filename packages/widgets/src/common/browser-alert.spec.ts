import { afterEach, describe, expect, it, vi } from "vitest";

import { addRememberedBrowserAlert, requestBrowserNotificationPermission } from "./browser-alert";

const originalNotification = window.Notification;

afterEach(() => {
  if (originalNotification === undefined) {
    Reflect.deleteProperty(window, "Notification");
    return;
  }
  Object.defineProperty(window, "Notification", { configurable: true, value: originalNotification });
});

describe("browser alert occurrence history", () => {
  it("moves a repeated occurrence to the end without duplicating it", () => {
    expect(addRememberedBrowserAlert(["first", "second"], "first")).toEqual(["second", "first"]);
  });

  it("bounds remembered occurrences", () => {
    const values = Array.from({ length: 110 }, (_, index) => String(index));
    const result = addRememberedBrowserAlert(values, "next");
    expect(result).toHaveLength(100);
    expect(result.at(-1)).toBe("next");
  });

  it("keeps the current permission when the browser rejects a permission request", async () => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        permission: "default",
        requestPermission: vi.fn().mockRejectedValue(new Error("blocked")),
      },
    });

    await expect(requestBrowserNotificationPermission()).resolves.toBe("default");
  });
});
