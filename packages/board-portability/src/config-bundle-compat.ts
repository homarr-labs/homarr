import type { HomarrConfigBundle } from "./schema";
import { homarrConfigBundleSchema } from "./schema";

export const CONFIG_BUNDLE_FORMAT_VERSION = "2.0";

export const SUPPORTED_CONFIG_BUNDLE_FORMAT_VERSIONS = [CONFIG_BUNDLE_FORMAT_VERSION] as const;

export type BundleCompatibilityStatus = "compatible" | "unsupportedVersion" | "invalidStructure";

export type BundleCompatibility = {
  status: BundleCompatibilityStatus;
  bundleVersion: string | null;
  bundleHomarrVersion: string | null;
  currentHomarrVersion: string;
  issues: string[];
};

const versionSupported = (version: string) =>
  (SUPPORTED_CONFIG_BUNDLE_FORMAT_VERSIONS as readonly string[]).includes(version);

export const parseConfigBundleJson = (content: string): HomarrConfigBundle => {
  const parsed: unknown = JSON.parse(content);
  return homarrConfigBundleSchema.parse(parsed);
};

export const assessBundleCompatibility = (
  raw: unknown,
  currentHomarrVersion: string,
): { bundle: HomarrConfigBundle | null; compatibility: BundleCompatibility } => {
  const issues: string[] = [];

  if (raw === null || typeof raw !== "object") {
    return {
      bundle: null,
      compatibility: {
        status: "invalidStructure",
        bundleVersion: null,
        bundleHomarrVersion: null,
        currentHomarrVersion,
        issues: ["File is not a valid JSON object"],
      },
    };
  }

  const record = raw as Record<string, unknown>;
  const bundleVersion = typeof record.version === "string" ? record.version : null;
  const bundleHomarrVersion = typeof record.homarrVersion === "string" ? record.homarrVersion : null;

  if (bundleVersion && !versionSupported(bundleVersion)) {
    issues.push(
      `Bundle format version "${bundleVersion}" is not supported. This instance expects version ${CONFIG_BUNDLE_FORMAT_VERSION}.`,
    );
    return {
      bundle: null,
      compatibility: {
        status: "unsupportedVersion",
        bundleVersion,
        bundleHomarrVersion,
        currentHomarrVersion,
        issues,
      },
    };
  }

  const parseResult = homarrConfigBundleSchema.safeParse(raw);
  if (!parseResult.success) {
    issues.push("Bundle structure does not match the current Homarr config schema.");
    issues.push("Ensure the exporting instance was upgraded and migrations have run before export.");
    return {
      bundle: null,
      compatibility: {
        status: "invalidStructure",
        bundleVersion,
        bundleHomarrVersion,
        currentHomarrVersion,
        issues,
      },
    };
  }

  const bundle = parseResult.data;

  if (bundle.homarrVersion !== currentHomarrVersion) {
    issues.push(
      `Exported from Homarr ${bundle.homarrVersion}; this instance is ${currentHomarrVersion}. Import is allowed when the bundle format matches.`,
    );
  }

  return {
    bundle,
    compatibility: {
      status: "compatible",
      bundleVersion: bundle.version,
      bundleHomarrVersion: bundle.homarrVersion,
      currentHomarrVersion,
      issues,
    },
  };
};

export const parseAndValidateBundle = (
  content: string,
  currentHomarrVersion: string,
): HomarrConfigBundle => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON");
  }

  const { bundle, compatibility } = assessBundleCompatibility(parsed, currentHomarrVersion);
  if (!bundle || compatibility.status !== "compatible") {
    throw new Error(compatibility.issues.join(" "));
  }

  return bundle;
};
