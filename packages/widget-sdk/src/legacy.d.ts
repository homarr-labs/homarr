import type { ComponentType } from "react";

/** Compatibility exports are supplied by Homarr's host; new widgets should use the regular SDK. */
export declare const LegacyWidget: ComponentType<{ template: string; requestCapabilities?: unknown }>;
export declare const LegacyConfiguration: ComponentType<{ schema: unknown; parameterNames?: Record<string, string[]> }>;
