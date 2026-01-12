import { describe, expect, it } from "vitest";

import {
  BACKUP_FORMAT_VERSION,
  formatEntityExport,
  formatJson,
  isVersionCompatible,
  parseEntityExport,
  parseJson,
} from "../json-format";

// Get the current Homarr version from formatEntityExport
const getHomarrVersion = (): string => formatEntityExport("board", {}).homarrVersion;

describe("BACKUP_FORMAT_VERSION", () => {
  it("should be a semantic version string", () => {
    expect(BACKUP_FORMAT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("formatEntityExport", () => {
  it("should wrap data with metadata envelope", () => {
    const data = { name: "test-board", items: [] };
    const result = formatEntityExport("board", data);

    expect(result).toHaveProperty("version", BACKUP_FORMAT_VERSION);
    expect(result).toHaveProperty("type", "board");
    expect(result).toHaveProperty("data", data);
    expect(result).toHaveProperty("exportedAt");
    expect(new Date(result.exportedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("should include homarrVersion from package.json", () => {
    const data = { name: "test-board", items: [] };
    const result = formatEntityExport("board", data);

    expect(result.homarrVersion).toBe(getHomarrVersion());
  });

  it("should set correct type for integration exports", () => {
    const data = { name: "test-integration", url: "http://example.com" };
    const result = formatEntityExport("integration", data);

    expect(result.type).toBe("integration");
  });
});

describe("parseEntityExport", () => {
  it("should parse valid JSON export", () => {
    const exportData = {
      version: "1.0.0",
      type: "board",
      data: { name: "test" },
      exportedAt: new Date().toISOString(),
    };
    const content = JSON.stringify(exportData);

    const result = parseEntityExport<{ name: string }>(content);

    // When homarrVersion is missing (legacy format), it's set to current package version
    expect(result).toEqual({ ...exportData, homarrVersion: getHomarrVersion() });
  });

  it("should preserve homarrVersion when present", () => {
    const exportData = {
      version: "1.0.0",
      homarrVersion: "1.2.3",
      type: "board",
      data: { name: "test" },
      exportedAt: new Date().toISOString(),
    };
    const content = JSON.stringify(exportData);

    const result = parseEntityExport<{ name: string }>(content);

    expect(result).toEqual(exportData);
  });

  it("should throw error for missing version", () => {
    const content = JSON.stringify({ type: "board", data: {} });

    expect(() => parseEntityExport(content)).toThrow("Invalid export format: missing required fields");
  });

  it("should throw error for missing type", () => {
    const content = JSON.stringify({ version: "1.0.0", data: {} });

    expect(() => parseEntityExport(content)).toThrow("Invalid export format: missing required fields");
  });

  it("should throw error for missing data", () => {
    const content = JSON.stringify({ version: "1.0.0", type: "board" });

    expect(() => parseEntityExport(content)).toThrow("Invalid export format: missing required fields");
  });

  it("should throw error for invalid JSON", () => {
    expect(() => parseEntityExport("not valid json")).toThrow();
  });
});

describe("isVersionCompatible", () => {
  it("should return true for version 1.x.x", () => {
    expect(isVersionCompatible("1.0.0")).toBe(true);
    expect(isVersionCompatible("1.0.1")).toBe(true);
    expect(isVersionCompatible("1.5.0")).toBe(true);
    expect(isVersionCompatible("1.99.99")).toBe(true);
  });

  it("should return false for version 2.x.x", () => {
    expect(isVersionCompatible("2.0.0")).toBe(false);
  });

  it("should return false for version 0.x.x", () => {
    expect(isVersionCompatible("0.9.0")).toBe(false);
  });
});

describe("formatJson", () => {
  it("should format data as pretty-printed JSON", () => {
    const data = { name: "test", count: 42 };
    const result = formatJson(data);

    expect(result).toBe(JSON.stringify(data, null, 2));
    expect(result).toContain("\n");
  });

  it("should handle arrays", () => {
    const data = [1, 2, 3];
    const result = formatJson(data);

    expect(result).toBe(JSON.stringify(data, null, 2));
  });
});

describe("parseJson", () => {
  it("should parse valid JSON", () => {
    const data = { name: "test" };
    const content = JSON.stringify(data);

    const result = parseJson<typeof data>(content);

    expect(result).toEqual(data);
  });

  it("should throw error with message for invalid JSON", () => {
    expect(() => parseJson("not valid json")).toThrow("Failed to parse JSON:");
  });
});
