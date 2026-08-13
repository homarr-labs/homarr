import { describe, expect, test } from "vitest";

import { getNetworkControllerMatrix } from "./display";

describe("Network controller advanced matrix", () => {
  test("retains every summary field without aggregating users and guests", () => {
    expect(
      getNetworkControllerMatrix({
        wanStatus: "enabled",
        www: { status: "disabled", latency: 22, ping: 14, uptime: 86400 },
        wifi: { status: "enabled", users: 12, guests: 2 },
        lan: { status: "enabled", users: 18, guests: 5 },
        vpn: { status: "disabled", users: 3 },
      }),
    ).toEqual([
      { key: "wan", status: "enabled", metrics: [] },
      {
        key: "web",
        status: "disabled",
        metrics: [
          { key: "latency", value: 22 },
          { key: "ping", value: 14 },
          { key: "uptime", value: 86400 },
        ],
      },
      {
        key: "wifi",
        status: "enabled",
        metrics: [
          { key: "users", value: 12 },
          { key: "guests", value: 2 },
        ],
      },
      {
        key: "lan",
        status: "enabled",
        metrics: [
          { key: "users", value: 18 },
          { key: "guests", value: 5 },
        ],
      },
      { key: "vpn", status: "disabled", metrics: [{ key: "users", value: 3 }] },
    ]);
  });
});
