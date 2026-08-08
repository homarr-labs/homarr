import { z } from "zod/v4";

import type { IntegrationKind } from "./integration";

export const SABNZBD_HISTORY_WINDOW_OPTIONS = [10, 20, 30] as const;

export type SabnzbdHistoryWindowDays = (typeof SABNZBD_HISTORY_WINDOW_OPTIONS)[number];

const sabnzbdHistoryWindowDaysSchema = z.union([z.literal(10), z.literal(20), z.literal(30)]);

export const sabnzbdIntegrationOptionsSchema = z
  .object({
    includeArchivedHistory: z.boolean().default(false),
    historyWindowDays: sabnzbdHistoryWindowDaysSchema.default(10),
  })
  .strict();

export type SabnzbdIntegrationOptions = z.infer<typeof sabnzbdIntegrationOptionsSchema>;

export const parseSabnzbdIntegrationOptions = (value: unknown): SabnzbdIntegrationOptions =>
  sabnzbdIntegrationOptionsSchema.parse(value);

export const DEFAULT_SABNZBD_INTEGRATION_OPTIONS = parseSabnzbdIntegrationOptions({});

export type IntegrationOptions = Record<string, unknown>;

const emptyIntegrationOptionsSchema = z.object({}).strict();

const integrationOptionsSchemas: Partial<Record<IntegrationKind, z.ZodType>> = {
  sabNzbd: sabnzbdIntegrationOptionsSchema,
};

export const getIntegrationOptionsSchema = (kind: IntegrationKind): z.ZodType =>
  integrationOptionsSchemas[kind] ?? emptyIntegrationOptionsSchema;

export const parseIntegrationOptions = (kind: IntegrationKind, value: unknown): IntegrationOptions =>
  getIntegrationOptionsSchema(kind).parse(value) as IntegrationOptions;

export const getDefaultIntegrationOptions = (kind: IntegrationKind): IntegrationOptions =>
  parseIntegrationOptions(kind, {});
