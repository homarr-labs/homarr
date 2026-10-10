import { z } from "zod";

export const renderSnapshotSchema = z
  .object({
    version: z.literal(1),
    requestId: z.string().uuid(),
    locale: z.string().min(2).max(35),
    theme: z.enum(["light", "dark"]),
    direction: z.enum(["ltr", "rtl"]),
    session: z.object({ kind: z.enum(["anonymous", "authenticated"]) }).readonly(),
    setup: z.object({ kind: z.enum(["unavailable", "required", "ready"]) }).readonly(),
    renderRevision: z.string().max(128),
  })
  .readonly();

export const renderAssetsSchema = z
  .object({
    entry: z.string().optional(),
    css: z.array(z.object({ href: z.string(), "data-vite-dev-id": z.string().optional() }).readonly()).readonly(),
    js: z.array(z.object({ href: z.string() }).readonly()).readonly(),
  })
  .readonly();

export const bootstrapSchema = z
  .object({
    snapshot: renderSnapshotSchema,
    assets: renderAssetsSchema,
  })
  .readonly();

export type RenderSnapshot = z.infer<typeof renderSnapshotSchema>;
export type RenderAssets = z.infer<typeof renderAssetsSchema>;
export type Bootstrap = z.infer<typeof bootstrapSchema>;

export interface PublicRenderSettings {
  readonly locale: string;
  readonly theme: "light" | "dark";
  readonly direction: "ltr" | "rtl";
  readonly renderRevision: string;
}
