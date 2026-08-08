import { describe, expect, it } from "vitest";

import {
  DEFAULT_SABNZBD_INTEGRATION_OPTIONS,
  getDefaultIntegrationOptions,
  parseIntegrationOptions,
  parseSabnzbdIntegrationOptions,
  SABNZBD_HISTORY_WINDOW_OPTIONS,
} from "./integration-options";

describe("SABnzbd integration options", () => {
  it("preserves standard SABnzbd history with a 10-day archive window by default", () => {
    expect(DEFAULT_SABNZBD_INTEGRATION_OPTIONS).toEqual({
      includeArchivedHistory: false,
      historyWindowDays: 10,
    });

    expect(getDefaultIntegrationOptions("sabNzbd")).toEqual({
      includeArchivedHistory: false,
      historyWindowDays: 10,
    });
  });

  it.each(SABNZBD_HISTORY_WINDOW_OPTIONS)("accepts a %i-day history window", (historyWindowDays) => {
    expect(
      parseSabnzbdIntegrationOptions({
        includeArchivedHistory: false,
        historyWindowDays,
      }),
    ).toEqual({
      includeArchivedHistory: false,
      historyWindowDays,
    });
  });

  it("rejects unsupported history windows", () => {
    expect(() =>
      parseSabnzbdIntegrationOptions({
        includeArchivedHistory: true,
        historyWindowDays: 15,
      }),
    ).toThrow();
  });

  it("rejects unknown SABnzbd option properties", () => {
    expect(() =>
      parseSabnzbdIntegrationOptions({
        includeArchivedHistory: true,
        historyWindowDays: 10,
        unexpected: true,
      }),
    ).toThrow();
  });

  it("keeps unsupported integrations on the strict empty schema", () => {
    expect(parseIntegrationOptions("radarr", {})).toEqual({});

    expect(() =>
      parseIntegrationOptions("radarr", {
        includeArchivedHistory: true,
      }),
    ).toThrow();
  });
});
