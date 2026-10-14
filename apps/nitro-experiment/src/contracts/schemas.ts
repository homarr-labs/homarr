import { z } from "zod";

export const schemaVersion = "nitro-fixture-v1";
export const boardIdSchema = z.enum(["public", "private"]);
export const identityIdSchema = z.enum(["owner", "viewer"]);
export const revisionSchema = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const generationSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const emptyInputSchema = z.strictObject({});
export const fixtureIdentitySchema = z.strictObject({
  id: identityIdSchema,
  label: z.string().min(1).max(80),
});
export const boardContentSchema = z.strictObject({
  label: z.string().trim().min(1).max(80),
  columns: z.number().int().min(1).max(4),
  widget: z.strictObject({ displayLabel: z.string().trim().min(1).max(80) }),
});
export const boardRecordSchema = z.strictObject({
  id: boardIdSchema,
  ownerId: identityIdSchema,
  visibility: z.enum(["public", "private"]),
  revision: revisionSchema,
  content: boardContentSchema,
});
export const accessCapabilitiesSchema = z.strictObject({
  canEdit: z.boolean(),
  variant: z.enum(["public-reader", "owner", "private-reader"]),
});
export const boardProjectionSchema = z.strictObject({
  id: boardIdSchema,
  visibility: z.enum(["public", "private"]),
  revision: revisionSchema,
  content: boardContentSchema,
  capabilities: accessCapabilitiesSchema,
});
export const widgetValueSchema = z.strictObject({
  value: z.number().finite().min(0).max(1000000),
  unit: z.literal("items"),
});
const observationSchema = z.strictObject({
  generation: generationSchema,
  observedAt: z.iso.datetime(),
  freshUntil: z.iso.datetime(),
  staleUntil: z.iso.datetime(),
});
export const widgetSnapshotSchema = z.discriminatedUnion("status", [
  observationSchema.extend({ status: z.literal("ready"), data: widgetValueSchema }),
  observationSchema.extend({
    status: z.literal("stale"),
    data: widgetValueSchema,
    error: z.enum(["source-error", "timeout", "invalid-response", "saturated", "not-implemented"]),
  }),
  z.strictObject({
    status: z.literal("unavailable"),
    generation: generationSchema,
    observedAt: z.null(),
    data: z.null(),
    error: z.enum(["source-error", "timeout", "invalid-response", "saturated", "not-implemented"]),
  }),
]);
export const boardReadInputSchema = z.strictObject({ boardId: boardIdSchema });
export const boardReadOutputSchema = boardProjectionSchema;
export const boardSaveInputSchema = z.strictObject({
  boardId: boardIdSchema,
  expectedRevision: revisionSchema,
  content: boardContentSchema,
});
export const boardSaveOutputSchema = z.strictObject({ board: boardProjectionSchema });
export const widgetReadInputSchema = boardReadInputSchema;
export const widgetReadOutputSchema = widgetSnapshotSchema;
export const sessionStateSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("anonymous"), fixtureOnly: z.literal(true) }),
  z.strictObject({
    status: z.literal("authenticated"),
    fixtureOnly: z.literal(true),
    identity: fixtureIdentitySchema,
    expiresAt: z.iso.datetime(),
  }),
]);
export const sessionSelectInputSchema = z.strictObject({ identityId: identityIdSchema });
export const sessionLogoutOutputSchema = z.strictObject({ loggedOut: z.literal(true) });
export const sourcePayloadSchema = z.strictObject({ data: widgetValueSchema });
export const sourceControlInputSchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("healthy"), value: widgetValueSchema.shape.value }),
  z.strictObject({ mode: z.literal("error") }),
  z.strictObject({ mode: z.literal("timeout") }),
]);
export const sourceControlOutputSchema = z.strictObject({
  mode: z.enum(["healthy", "error", "timeout"]),
  generation: generationSchema,
});
export const boardSnapshotSchema = z.strictObject({
  board: boardProjectionSchema,
  widget: widgetSnapshotSchema,
});
export const renderIdentitySchema = z.strictObject({
  boardId: boardIdSchema,
  revision: revisionSchema,
  widgetGeneration: generationSchema,
  buildId: z.string().min(1).max(128),
  schemaVersion: z.literal(schemaVersion),
  variant: accessCapabilitiesSchema.shape.variant,
  locale: z.literal("en"),
  theme: z.literal("light"),
});
export const renderAssetsSchema = z.strictObject({
  entry: z.string().max(2048).optional(),
  js: z.array(z.strictObject({ href: z.string().max(2048) })).max(128),
  css: z
    .array(z.strictObject({ href: z.string().max(2048), "data-vite-dev-id": z.string().max(4096).optional() }))
    .max(128),
});
export const bootstrapSchema = z
  .strictObject({
    identity: renderIdentitySchema,
    snapshot: boardSnapshotSchema,
    assets: renderAssetsSchema,
    routerState: z.json(),
    queryState: z.json(),
  })
  .superRefine((value, context) => {
    if (
      value.identity.boardId !== value.snapshot.board.id ||
      value.identity.revision !== value.snapshot.board.revision ||
      value.identity.widgetGeneration !== value.snapshot.widget.generation ||
      value.identity.variant !== value.snapshot.board.capabilities.variant
    ) {
      context.addIssue({ code: "custom", message: "Bootstrap identity does not match its snapshot" });
    }
  });
export const renderArtifactSchema = z.strictObject({
  html: z.string().min(1).max(1048576),
  bootstrap: bootstrapSchema,
  createdAt: z.iso.datetime(),
});
export const errorDataSchema = z.strictObject({ reason: z.string().min(1).max(160) });
export const conflictDataSchema = z.strictObject({ currentRevision: revisionSchema });
export const apiErrors = {
  NOT_FOUND: { message: "Fixture board not found", data: errorDataSchema },
  UNAUTHORIZED: { message: "Fixture session required", data: errorDataSchema },
  FORBIDDEN: { message: "Fixture access denied", data: errorDataSchema },
  BAD_REQUEST: { message: "Invalid fixture request", data: errorDataSchema },
  CONFLICT: { message: "Board revision changed", data: conflictDataSchema },
  NOT_IMPLEMENTED: { message: "Fixture capability is not implemented", data: errorDataSchema },
  SERVICE_UNAVAILABLE: { message: "Fixture capacity unavailable", data: errorDataSchema },
};

export type BoardId = z.infer<typeof boardIdSchema>;
export type IdentityId = z.infer<typeof identityIdSchema>;
export type FixtureIdentity = z.infer<typeof fixtureIdentitySchema>;
export type BoardContent = z.infer<typeof boardContentSchema>;
export type BoardRecord = z.infer<typeof boardRecordSchema>;
export type AccessCapabilities = z.infer<typeof accessCapabilitiesSchema>;
export type BoardProjection = z.infer<typeof boardProjectionSchema>;
export type BoardReadInput = z.infer<typeof boardReadInputSchema>;
export type BoardSaveInput = z.infer<typeof boardSaveInputSchema>;
export type BoardSaveOutput = z.infer<typeof boardSaveOutputSchema>;
export type WidgetSnapshot = z.infer<typeof widgetSnapshotSchema>;
export type WidgetReadInput = z.infer<typeof widgetReadInputSchema>;
export type WidgetReadOutput = z.infer<typeof widgetReadOutputSchema>;
export type SessionState = z.infer<typeof sessionStateSchema>;
export type SessionSelectInput = z.infer<typeof sessionSelectInputSchema>;
export type SessionLogoutOutput = z.infer<typeof sessionLogoutOutputSchema>;
export type SourcePayload = z.infer<typeof sourcePayloadSchema>;
export type SourceControlInput = z.infer<typeof sourceControlInputSchema>;
export type SourceControlOutput = z.infer<typeof sourceControlOutputSchema>;
export type BoardSnapshot = z.infer<typeof boardSnapshotSchema>;
export type RenderIdentity = z.infer<typeof renderIdentitySchema>;
export type RenderAssets = z.infer<typeof renderAssetsSchema>;
export type Bootstrap = z.infer<typeof bootstrapSchema>;
export type RenderArtifact = z.infer<typeof renderArtifactSchema>;
