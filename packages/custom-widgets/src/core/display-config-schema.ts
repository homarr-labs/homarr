import { z } from "zod/v4";

import {
  countGridDisplayConfigSchema,
  keyValueDisplayConfigSchema,
  progressBarsDisplayConfigSchema,
  rawDisplayConfigSchema,
  singleValueDisplayConfigSchema,
  statGridDisplayConfigSchema,
  statusIndicatorDisplayConfigSchema,
  tableDisplayConfigSchema,
} from "./built-in-display-schemas";
import { customJsxDisplayConfigV1Schema, customJsxDisplayConfigV2Schema } from "./custom-jsx-schema";

const actionButtonDisplayConfigSchema = z.object({
  type: z
    .literal("actionButton")
    .describe("Display type discriminator — must be 'actionButton' when displayType is actionButton"),
  buttonLabel: z
    .string()
    .min(1)
    .describe("Text shown on the action button (e.g. 'Restart Service', 'Clear Cache', 'Run Backup')"),
  buttonColor: z
    .string()
    .optional()
    .describe("Mantine color name for the button (e.g. 'blue', 'red', 'green'). Default: blue"),
  confirmText: z
    .string()
    .optional()
    .describe(
      "If set, shows a confirmation dialog with this message before executing the API request. Omit for immediate execution.",
    ),
  successMessage: z
    .string()
    .optional()
    .describe("Notification message shown after successful API execution. Omit for a generic success message."),
});

export const displayConfigSchema = z
  .union([
    singleValueDisplayConfigSchema,
    keyValueDisplayConfigSchema,
    tableDisplayConfigSchema,
    statGridDisplayConfigSchema,
    progressBarsDisplayConfigSchema,
    statusIndicatorDisplayConfigSchema,
    countGridDisplayConfigSchema,
    rawDisplayConfigSchema,
    actionButtonDisplayConfigSchema,
    customJsxDisplayConfigV2Schema,
    customJsxDisplayConfigV1Schema,
  ])
  .describe(
    "Configuration for how API response data is displayed. The 'type' field MUST match the top-level 'displayType' field exactly. Choose the variant that matches your displayType.",
  );

export type DisplayConfig = z.infer<typeof displayConfigSchema>;
