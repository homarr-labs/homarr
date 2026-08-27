import { describe, expect, test } from "vitest";

import { getNetworkControllerStatusLayout } from "./layout";

describe("network controller status layout", () => {
  test.each([
    {
      name: "minimum compact",
      input: { width: 160, height: 90, displayMode: "compact" as const, content: "wifi" as const },
      expected: { padding: 4, columns: 1, showWifi: true, showWired: false, horizontalStats: true },
    },
    {
      name: "short compact",
      input: { width: 200, height: 149, displayMode: "compact" as const, content: "wired" as const },
      expected: { padding: "sm", columns: 1, showWifi: false, showWired: true, horizontalStats: true },
    },
    {
      name: "typical compact",
      input: { width: 320, height: 220, displayMode: "compact" as const, content: "wifi" as const },
      expected: { padding: "sm", columns: 1, showWifi: true, showWired: false, horizontalStats: false },
    },
    {
      name: "advanced below wide boundary",
      input: { width: 559, height: 320, displayMode: "advanced" as const, content: "wifi" as const },
      expected: {
        padding: "md",
        columns: 1,
        sourceColumns: 1,
        showWifi: true,
        showWired: true,
        horizontalStats: false,
      },
    },
    {
      name: "wide advanced",
      input: { width: 560, height: 320, displayMode: "advanced" as const, content: "wired" as const },
      expected: {
        padding: "md",
        columns: 2,
        sourceColumns: 1,
        showWifi: true,
        showWired: true,
        horizontalStats: false,
      },
    },
    {
      name: "advanced at 200 percent zoom",
      input: { width: 280, height: 320, displayMode: "advanced" as const, content: "wired" as const },
      expected: { padding: "md", columns: 1, showWifi: true, showWired: true, horizontalStats: false },
    },
  ])("selects the $name tier", ({ input, expected }) => {
    expect(getNetworkControllerStatusLayout(input)).toMatchObject(expected);
  });

  test("keeps breakpoint boundaries explicit", () => {
    expect(
      getNetworkControllerStatusLayout({ width: 200, height: 150, displayMode: "compact", content: "wifi" }),
    ).toMatchObject({ padding: "sm", horizontalStats: false });
    expect(
      getNetworkControllerStatusLayout({ width: 199, height: 119, displayMode: "compact", content: "wifi" }),
    ).toMatchObject({ padding: 4, horizontalStats: true });
    expect(
      getNetworkControllerStatusLayout({ width: 199, height: 80, displayMode: "compact", content: "wifi" }),
    ).toMatchObject({ inlineStats: false });
    expect(
      getNetworkControllerStatusLayout({ width: 199, height: 79, displayMode: "compact", content: "wifi" }),
    ).toMatchObject({ inlineStats: true });
    expect(
      getNetworkControllerStatusLayout({ width: 960, height: 320, displayMode: "advanced", content: "wifi" }),
    ).toMatchObject({ sourceColumns: 2 });
  });
});
