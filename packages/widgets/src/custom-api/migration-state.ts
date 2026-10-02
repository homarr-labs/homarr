const LEGACY_MIGRATION_ERROR = "LEGACY_CUSTOM_WIDGET_MIGRATION_REQUIRED";
const TERMINAL_DEFINITION_CODES = new Set(["NOT_FOUND", "FORBIDDEN", "PRECONDITION_FAILED"]);

export function isLegacyCustomWidgetMigrationError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "message" in error && error.message === LEGACY_MIGRATION_ERROR);
}

export function isTerminalCustomWidgetDefinitionError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("data" in error)) return false;
  const data = error.data;
  if (!data || typeof data !== "object" || !("code" in data) || typeof data.code !== "string") return false;
  return TERMINAL_DEFINITION_CODES.has(data.code);
}
