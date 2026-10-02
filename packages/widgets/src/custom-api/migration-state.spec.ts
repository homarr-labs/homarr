import { describe, expect, it } from "vitest";

import { isLegacyCustomWidgetMigrationError, isTerminalCustomWidgetDefinitionError } from "./migration-state";

describe("custom widget migration state", () => {
  it("recognizes the preserved legacy definition error and stops retries", () => {
    const error = {
      message: "LEGACY_CUSTOM_WIDGET_MIGRATION_REQUIRED",
      data: { code: "PRECONDITION_FAILED" },
    };

    expect(isLegacyCustomWidgetMigrationError(error)).toBe(true);
    expect(isTerminalCustomWidgetDefinitionError(error)).toBe(true);
  });

  it("does not label an invalid v2 configuration as a legacy migration", () => {
    const error = {
      message: "Custom widget configuration needs repair",
      data: { code: "PRECONDITION_FAILED" },
    };

    expect(isLegacyCustomWidgetMigrationError(error)).toBe(false);
    expect(isTerminalCustomWidgetDefinitionError(error)).toBe(true);
  });

  it("allows transient request failures to retry", () => {
    const error = { message: "Request failed", data: { code: "INTERNAL_SERVER_ERROR" } };

    expect(isLegacyCustomWidgetMigrationError(error)).toBe(false);
    expect(isTerminalCustomWidgetDefinitionError(error)).toBe(false);
  });
});
