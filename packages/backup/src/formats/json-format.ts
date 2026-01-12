import packageJson from "../../../../package.json";
import type { EntityExport } from "../types";

/**
 * Current version of the export format
 */
export const BACKUP_FORMAT_VERSION = "1.0.0";

/**
 * Formats entity data for JSON export with metadata envelope
 */
export const formatEntityExport = <T>(type: "board" | "integration", data: T): EntityExport<T> => {
  return {
    version: BACKUP_FORMAT_VERSION,
    homarrVersion: packageJson.version,
    exportedAt: new Date().toISOString(),
    type,
    data,
  };
};

/**
 * Parses JSON content and validates the export format
 */
export const parseEntityExport = <T>(content: string): EntityExport<T> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const parsed = JSON.parse(content);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("version" in parsed) ||
    !("type" in parsed) ||
    !("data" in parsed)
  ) {
    throw new Error("Invalid export format: missing required fields");
  }

  // For backward compatibility, if homarrVersion is missing, use current version
  if (!("homarrVersion" in parsed)) {
    (parsed as EntityExport<T>).homarrVersion = packageJson.version;
  }

  return parsed as EntityExport<T>;
};

/**
 * Checks if a backup version is compatible with the current version
 */
export const isVersionCompatible = (version: string): boolean => {
  // For now, accept version 1.x.x
  return version.startsWith("1.");
};

/**
 * Formats data as pretty-printed JSON
 */
export const formatJson = (data: unknown): string => {
  return JSON.stringify(data, null, 2);
};

/**
 * Parses JSON safely with error handling
 */
export const parseJson = <T>(content: string): T => {
  try {
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
