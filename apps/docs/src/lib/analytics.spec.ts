import posthog from "posthog-js";
import { expect, test, vi } from "vitest";

import { initAnalytics, track } from "./analytics";

vi.mock("posthog-js", () => ({ default: { init: vi.fn(), capture: vi.fn() } }));

test("attributes automatic and custom events without leaking URL queries", () => {
  initAnalytics();
  const beforeSend = vi.mocked(posthog.init).mock.calls[0]?.[1]?.before_send;
  if (typeof beforeSend !== "function") throw new Error("Missing analytics event hook");

  const pageview = beforeSend({
    uuid: "pageview",
    event: "$pageview",
    properties: {
      $current_url: "https://homarr.dev/docs/?token=secret#section",
      $set: { $initial_current_url: "https://homarr.dev/?token=secret" },
    },
  });
  expect(pageview?.properties).toMatchObject({
    site: "homarr-docs",
    source_path: window.location.pathname,
    $current_url: "https://homarr.dev/docs/",
    $set: { $initial_current_url: "https://homarr.dev/" },
  });

  track("Workshop Item Downloaded", { item_id: "widget", method: "clipboard" });
  expect(posthog.capture).toHaveBeenCalledWith("Workshop Item Downloaded", {
    item_id: "widget",
    method: "clipboard",
    source_path: window.location.pathname,
  });
  expect(
    beforeSend({ uuid: "custom", event: "Workshop Item Downloaded", properties: { source_path: "/workshop/widget" } })
      ?.properties.source_path,
  ).toBe("/workshop/widget");
});
