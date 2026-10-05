import { describe, expect, test } from "vitest";

import { createNextcloudCalendarServerUrl } from "../nextcloud-url";

describe("createNextcloudCalendarServerUrl", () => {
  test("uses the DAV endpoint for a root installation", () => {
    expect(createNextcloudCalendarServerUrl("https://cloud.example.com")).toBe(
      "https://cloud.example.com/remote.php/dav/",
    );
  });

  test("preserves the base path for a subpath installation", () => {
    expect(createNextcloudCalendarServerUrl("https://example.com/nextcloud")).toBe(
      "https://example.com/nextcloud/remote.php/dav/",
    );
  });

  test("does not duplicate a trailing slash", () => {
    expect(createNextcloudCalendarServerUrl("https://example.com/nextcloud/")).toBe(
      "https://example.com/nextcloud/remote.php/dav/",
    );
  });

  test("does not duplicate an existing DAV endpoint", () => {
    expect(createNextcloudCalendarServerUrl("https://example.com/nextcloud/remote.php/dav")).toBe(
      "https://example.com/nextcloud/remote.php/dav/",
    );
  });
});
