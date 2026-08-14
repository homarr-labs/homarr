import { describe, expect, test } from "vitest";

import { getNotificationDisplay } from "./display";

describe("notification display", () => {
  test("advanced mode exposes logos, sources, and full bodies", () => {
    expect(
      getNotificationDisplay({ displayMode: "advanced", hideLogos: true, isRoomy: false, bodyLineClamp: 1 }),
    ).toEqual({
      showLogos: true,
      showSource: true,
      bodyLineClamp: undefined,
    });
  });

  test("compact mode respects presentation constraints", () => {
    expect(
      getNotificationDisplay({ displayMode: "compact", hideLogos: true, isRoomy: false, bodyLineClamp: 2 }),
    ).toEqual({
      showLogos: false,
      showSource: false,
      bodyLineClamp: 2,
    });
  });
});
