import { z } from "zod/v4";

import {
  customWidgetOptionsSchema,
  customWidgetRequestsSchema,
  customWidgetSecretKinds,
  customWidgetSourcesSchema,
} from "../core";
import type { CustomJsxRequest, CustomWidgetOptions, CustomWidgetSource } from "../core";

const encryptedSecretSchema = z.object({
  sourceId: z.string(),
  kind: z.enum(customWidgetSecretKinds),
  value: z.string(),
});

export const sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  revision: z.number().int().nonnegative(),
  expiresAt: z.number(),
  sources: customWidgetSourcesSchema,
  secrets: z.array(encryptedSecretSchema),
  requests: customWidgetRequestsSchema,
  name: z.string(),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
  template: z.string(),
  optionDefinitions: customWidgetOptionsSchema,
  options: z.record(z.string(), z.unknown()),
  definitionId: z.string().optional(),
  liveActions: z.boolean(),
});
export type CustomWidgetPreviewSession = z.infer<typeof sessionSchema>;

export interface CreatePreviewSessionInput {
  userId: string;
  sources: Record<string, CustomWidgetSource>;
  secrets: Array<{ sourceId: string; kind: (typeof customWidgetSecretKinds)[number]; value: string }>;
  requests: Record<string, CustomJsxRequest>;
  name: string;
  description?: string;
  iconUrl?: string;
  template: string;
  optionDefinitions: CustomWidgetOptions;
  options: Record<string, unknown>;
  definitionId?: string;
}

export interface PreviewSessionStore {
  saveSession(id: string, value: unknown, ttlMs: number): Promise<void>;
  compareAndSwapSession(id: string, expectedRevision: number, value: unknown, ttlMs: number): Promise<boolean>;
  getSession(id: string): Promise<unknown>;
  deleteSession(id: string): Promise<void>;
  appendJournal(id: string, value: unknown, maxEntries: number, ttlMs: number): Promise<void>;
  getJournal(id: string, maxEntries: number): Promise<unknown[]>;
  saveEvidence(id: string, key: string, value: unknown, ttlMs: number): Promise<void>;
  getEvidence(id: string): Promise<unknown[]>;
}

export interface PreviewSessionServiceOptions {
  createId(): string;
  encrypt(value: string): string;
  decrypt(value: string): string;
  now?: () => number;
  store?: PreviewSessionStore;
}
