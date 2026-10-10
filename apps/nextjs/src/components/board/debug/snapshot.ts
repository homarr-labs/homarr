import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { TRPC_ERROR_CODES_BY_KEY } from "@trpc/server/rpc";
import type { TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";
import { serialize, deserialize } from "superjson";
import { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { collectBoardSnapshotState } from "@homarr/api/board-snapshot";
import { getRootSectionLane } from "@homarr/definitions";
import { isWidgetDataQueryKey } from "@homarr/api/query-cache";
import type { useIntegrations } from "@homarr/auth/client";
import type { useSettings } from "@homarr/settings";
import { brandingServerSettingsSchema } from "@homarr/server-settings";
import { supportedLanguages } from "@homarr/translation/languages";
import { boardLayoutSchema, boardSettingsSchema } from "@homarr/validation/board";
import { commonItemSchema, sectionSchema } from "@homarr/validation/shared";
import { headerPreferencesSchema } from "@homarr/validation/user";

import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";
import { matchesContainerFilter } from "@homarr/widgets/docker/filter";

import { createSnapshotRedactor } from "./redact";
import { snapshotPublicFields } from "./public-fields";

export const maxSnapshotBytes = 10 * 1024 * 1024;
const boardSchema = boardSettingsSchema.extend({
  customCss: z.string().nullable(),
  isPublic: z.boolean(),
  creatorId: z.string().nullable(),
  creator: z
    .object({ id: z.string(), name: z.string().nullable(), image: z.string().nullable(), email: z.string().nullable() })
    .nullable(),
  userPermissions: z.array(z.object({ permission: z.enum(["view", "modify", "full"]) })),
  groupPermissions: z.array(
    z.object({ permission: z.enum(["view", "modify", "full"]), boardId: z.string(), groupId: z.string() }),
  ),
  layouts: z.array(boardLayoutSchema).min(1).max(100),
  sections: z.array(sectionSchema).min(1).max(2000),
  items: z.array(commonItemSchema).max(2000),
});
const settingsSchema = z.object({
  firstDayOfWeek: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  defaultSearchEngineId: z.string().nullable(),
  homeBoardId: z.string().nullable(),
  mobileHomeBoardId: z.string().nullable(),
  byteUnitSystem: z.enum(["decimal", "binary"]),
  openSearchInNewTab: z.boolean(),
  ddgBangs: z.boolean(),
  pingIconsEnabled: z.boolean(),
  enableRightClickOnWidgets: z.boolean(),
  headerPreferences: headerPreferencesSchema,
  enableStatusByDefault: z.boolean(),
  forceDisableStatus: z.boolean(),
  enableGravatar: z.boolean(),
  branding: brandingServerSettingsSchema,
});
const errorCodeSchema = z.enum(Object.keys(TRPC_ERROR_CODES_BY_KEY) as [TRPC_ERROR_CODE_KEY, ...TRPC_ERROR_CODE_KEY[]]);
const querySchema = z.object({
  key: z.array(z.unknown()).min(1),
  data: z.unknown().optional(),
  status: z.enum(["success", "error", "pending"]),
  errorCode: errorCodeSchema.optional(),
  updatedAt: z.number().finite(),
});
const payloadSchema = z.object({
  board: boardSchema,
  settings: settingsSchema,
  integrations: z
    .array(
      z.object({
        id: z.string(),
        permissions: z.object({
          hasUseAccess: z.boolean(),
          hasInteractAccess: z.boolean(),
          hasFullAccess: z.boolean(),
        }),
      }),
    )
    .max(2000),
  queries: z.array(querySchema).max(10000),
  viewport: z.object({
    width: z.number().int().min(200).max(10000),
    height: z.number().int().min(200).max(10000),
    layoutId: z.string(),
    scrollX: z.number().finite().min(0).max(1_000_000).default(0),
    scrollY: z.number().finite().min(0).max(1_000_000).default(0),
  }),
  locale: z.enum(supportedLanguages),
  colorScheme: z.enum(["dark", "light"]),
  localStates: z
    .array(z.object({ key: z.tuple([z.literal("timer"), z.string(), z.string()]), value: z.unknown() }))
    .max(2000)
    .default([]),
});
export type BoardSnapshotPayload = z.infer<typeof payloadSchema>;
export interface BoardSnapshot {
  format: "homarr-board-snapshot";
  version: 1;
  capturedAt: string;
  payload: ReturnType<typeof serialize>;
}

export const isSnapshotQueryKey = (key: QueryKey) => {
  if (Array.isArray(key[0]) && !key[0].every((part) => typeof part === "string" && snapshotPublicFields.has(part)))
    return false;
  if (Array.isArray(key[0]) && key[0][0] === "widget") return true;
  if (isWidgetDataQueryKey(key)) return true;
  return key[0] === "custom-widget" || key[0] === "board-debug-beszel" || key[0] === "board-debug-calendar";
};

const redactQueryKey = (key: QueryKey, redactor: ReturnType<typeof createSnapshotRedactor>) => {
  const { redact } = redactor;
  // tRPC procedure names describe code; input values carry private data.
  if (Array.isArray(key[0])) return [key[0], ...key.slice(1).map((value) => redact(value))];
  if (key[0] === "custom-widget") {
    const params = JSON.parse(String(key[4] ?? "{}")) as unknown;
    return [
      key[0],
      key[1],
      redact(key[2]),
      redactor.field(String(key[3])),
      JSON.stringify(redact(params)),
      redact(key[5]),
    ];
  }
  return [key[0], ...key.slice(1).map((value) => redact(value))];
};

export const createBoardSnapshot = async ({
  queryClient,
  ...context
}: {
  board: RouterOutputs["board"]["getBoardByName"];
  settings: ReturnType<typeof useSettings>;
  integrations: ReturnType<typeof useIntegrations>;
  viewport: z.input<typeof payloadSchema>["viewport"];
  locale: string;
  colorScheme: "dark" | "light";
  queryClient: QueryClient;
}): Promise<BoardSnapshot> => {
  const queries = queryClient
    .getQueryCache()
    .getAll()
    .filter((query) => isSnapshotQueryKey(query.queryKey) && query.getObserversCount() > 0);
  const redactor = await createBoardRedactor(
    context.board,
    context.settings,
    queries.map((query) => ({ key: query.queryKey, data: query.state.data })),
  );
  const { redact } = redactor;
  const widgetStates = collectBoardSnapshotState();
  const payload = {
    ...(redact({ ...context, board: redactor.board }) as Omit<BoardSnapshotPayload, "queries">),
    // Locale is a code, not user text.
    locale: context.locale,
    localStates: redact(captureLocalStates(context.board)),
    queries: [
      ...queries.map((query) => ({
        key: redactQueryKey(query.queryKey, redactor),
        data: redact(query.state.data),
        status: query.state.status,
        errorCode: getErrorCode(query.state.error),
        updatedAt: query.state.dataUpdatedAt,
      })),
      ...widgetStates.map((state) => ({
        key: redactQueryKey(state.key, redactor),
        data: redact(state.data),
        status: "success",
        updatedAt: Date.now(),
      })),
    ],
  };
  return serializeSnapshot(payloadSchema.parse(payload));
};

const captureLocalStates = (board: BoardSnapshotPayload["board"]) => {
  const states: { key: ["timer", string, string]; value: unknown }[] = [];
  if (typeof window === "undefined") return states;
  for (const item of board.items) {
    if (item.kind !== "timer") continue;
    try {
      const stored = window.localStorage.getItem(`homarr:timer:${board.id}:${item.id}:state`);
      if (stored) states.push({ key: ["timer", board.id, item.id], value: JSON.parse(stored) });
    } catch {
      /* Missing or invalid local widget state is optional. */
    }
  }
  return states;
};

const getErrorCode = (error: unknown) => {
  if (!error || typeof error !== "object" || !("data" in error)) return undefined;
  const data = error.data;
  if (!data || typeof data !== "object" || !("code" in data) || typeof data.code !== "string") return undefined;
  const parsed = errorCodeSchema.safeParse(data.code);
  if (parsed.success) return parsed.data;
  return undefined;
};

const validateTree = (value: unknown, depth = 0) => {
  if (depth > 40) throw new Error("Snapshot data is too deeply nested");
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) throw new Error("Unsafe snapshot property");
    validateTree(child, depth + 1);
  }
};

export const parseBoardSnapshot = async (
  text: string,
): Promise<{ snapshot: BoardSnapshot; payload: BoardSnapshotPayload }> => {
  if (new TextEncoder().encode(text).length > maxSnapshotBytes) throw new Error("Snapshot exceeds the 10 MB limit");
  const raw: unknown = JSON.parse(text);
  validateTree(raw);
  const envelope = z
    .object({
      format: z.literal("homarr-board-snapshot"),
      version: z.literal(1),
      capturedAt: z.iso.datetime(),
      payload: z.object({ json: z.unknown(), meta: z.unknown().optional() }),
    })
    .parse(raw);
  // Only Date and undefined annotations are needed by widget data. Never load
  // arbitrary SuperJSON classes, symbols or referential-equality metadata.
  const meta = envelope.payload.meta;
  if (meta) {
    const parsedMeta = z
      .object({
        values: z.record(z.string(), z.tuple([z.enum(["Date", "undefined"])])).optional(),
        v: z.literal(1).optional(),
      })
      .strict()
      .parse(meta);
    envelope.payload.meta = parsedMeta;
  }
  const decoded = deserialize(envelope.payload as BoardSnapshot["payload"]);
  validateTree(decoded);
  const parsed = payloadSchema.parse(decoded);
  validateBoardReferences(parsed);
  for (const query of parsed.queries) {
    if (!isSnapshotQueryKey(query.key)) throw new Error("Snapshot contains a non-widget query");
  }
  // Imported files are untrusted, including files marked as redacted.
  const redactor = await createBoardRedactor(parsed.board, parsed.settings, parsed.queries);
  const { redact } = redactor;
  const payload = payloadSchema.parse({
    ...(redact({ ...parsed, board: redactor.board }) as BoardSnapshotPayload),
    locale: parsed.locale,
    queries: parsed.queries.map((query) => ({
      ...query,
      key: redactQueryKey(query.key, redactor),
      data: redact(query.data),
    })),
  });
  return { snapshot: serializeSnapshot(payload, envelope.capturedAt), payload };
};

const createBoardRedactor = async (
  board: BoardSnapshotPayload["board"],
  settings: BoardSnapshotPayload["settings"],
  queries: { key: QueryKey; data?: unknown }[],
) => {
  const redactor = createSnapshotRedactor();
  const preserveSchemaFields = (schema: z.ZodType, key = "") => {
    if (schema instanceof z.ZodObject) {
      for (const [name, child] of Object.entries(schema.shape)) {
        redactor.preserveField(name);
        preserveSchemaFields(child as z.ZodType, name);
      }
    } else if (schema instanceof z.ZodEnum) {
      for (const value of schema.options) if (typeof value === "string") redactor.preserve(key, value);
    } else if (schema instanceof z.ZodLiteral) {
      for (const value of schema.values) if (typeof value === "string") redactor.preserve(key, value);
    } else if (schema instanceof z.ZodArray) preserveSchemaFields(schema.element as z.ZodType, key);
    else if (schema instanceof z.ZodTuple) {
      for (const child of schema.def.items) preserveSchemaFields(child as z.ZodType, key);
      if (schema.def.rest) preserveSchemaFields(schema.def.rest as z.ZodType, key);
    } else if (schema instanceof z.ZodUnion)
      schema.options.forEach((child) => preserveSchemaFields(child as z.ZodType, key));
    else if (schema instanceof z.ZodIntersection) {
      preserveSchemaFields(schema.def.left as z.ZodType, key);
      preserveSchemaFields(schema.def.right as z.ZodType, key);
    } else if (
      schema instanceof z.ZodOptional ||
      schema instanceof z.ZodNonOptional ||
      schema instanceof z.ZodNullable ||
      schema instanceof z.ZodDefault
    )
      preserveSchemaFields(schema.unwrap() as z.ZodType, key);
    else if (schema instanceof z.ZodPipe) preserveSchemaFields(schema.in as z.ZodType, key);
  };
  preserveSchemaFields(payloadSchema);
  const kinds = [...new Set(board.items.map((item) => item.kind))];
  const definitions = await Promise.all(kinds.map((kind) => loadWidgetDefinition(kind)));
  for (const definition of definitions) {
    for (const [name, option] of Object.entries(definition.createOptions(settings))) {
      redactor.preserveField(name);
      if (option.type !== "select" && option.type !== "multiSelect") continue;
      for (const value of option.options) {
        let publicValue = value;
        if (typeof value !== "string") publicValue = value.value;
        if (typeof publicValue === "string") redactor.preserve(name, publicValue);
      }
    }
  }
  const resolvedBoard = {
    ...board,
    items: board.items.map((item) => {
      const definition = definitions[kinds.indexOf(item.kind)];
      if (!definition) throw new Error("Unknown widget definition");
      const options = reduceWidgetOptionsWithDefinition(definition, settings, item.options);
      if (item.kind !== "dockerContainers") return { ...item, options };
      const filter = z
        .object({
          containerFilter: z.array(z.string()),
          filterIsWhitelist: z.boolean(),
          filterCaseSensitive: z.boolean(),
          filterAllowWildcards: z.boolean(),
        })
        .parse(options);
      // Resolve private patterns before changing names. An exact blacklist also
      // represents both an empty result and an unfiltered result without sentinels.
      const excluded = new Set<string>();
      for (const query of queries) {
        if (!Array.isArray(query.key[0]) || query.key[0].join(".") !== "docker.getContainers") continue;
        const result = z.object({ containers: z.array(z.object({ name: z.string() })) }).safeParse(query.data);
        if (!result.success) continue;
        for (const container of result.data.containers) {
          if (!matchesContainerFilter(container.name, filter)) excluded.add(redactor.string(container.name, "name"));
        }
      }
      return {
        ...item,
        options: {
          ...options,
          containerFilter: [...excluded],
          filterIsWhitelist: false,
          filterCaseSensitive: true,
          filterAllowWildcards: false,
        },
      };
    }),
  };
  return { ...redactor, board: resolvedBoard };
};

const validateBoardReferences = ({ board, viewport }: BoardSnapshotPayload) => {
  const layoutIds = new Set(board.layouts.map((layout) => layout.id));
  const sectionIds = new Set(board.sections.map((section) => section.id));
  const itemIds = new Set(board.items.map((item) => item.id));
  if (
    layoutIds.size !== board.layouts.length ||
    sectionIds.size !== board.sections.length ||
    itemIds.size !== board.items.length
  )
    throw new Error("Duplicate board IDs");
  if (
    !layoutIds.has(viewport.layoutId) ||
    !board.sections.some((section) => section.kind === "empty" && section.xOffset === 0)
  )
    throw new Error("Snapshot is missing its active layout or main section");
  for (const item of board.items) {
    for (const layout of item.layouts) {
      if (!layoutIds.has(layout.layoutId) || !sectionIds.has(layout.sectionId))
        throw new Error("Invalid widget placement");
    }
  }
  const parents = new Map<string, string>();
  const roots = board.sections.filter((section) => section.kind === "empty");
  if (new Set(roots.map((section) => getRootSectionLane(section.xOffset))).size !== roots.length)
    throw new Error("Duplicate root sections");
  for (const section of board.sections) {
    if (section.kind !== "container") continue;
    for (const layout of section.layouts) {
      if (!layoutIds.has(layout.layoutId) || !sectionIds.has(layout.parentSectionId))
        throw new Error("Invalid section placement");
      parents.set(`${layout.layoutId}:${section.id}`, layout.parentSectionId);
      let parent: string | undefined = section.id;
      const visited = new Set<string>();
      while (parent) {
        if (visited.has(parent)) throw new Error("Cyclic board sections");
        visited.add(parent);
        parent = parents.get(`${layout.layoutId}:${parent}`);
      }
    }
  }
};

const serializeSnapshot = (payload: BoardSnapshotPayload, capturedAt = new Date().toISOString()): BoardSnapshot => ({
  format: "homarr-board-snapshot",
  version: 1,
  capturedAt,
  payload: serialize(payload),
});

export const downloadBoardSnapshot = (snapshot: BoardSnapshot) => {
  const text = JSON.stringify(snapshot, null, 2);
  if (new TextEncoder().encode(text).length > maxSnapshotBytes) throw new Error("Snapshot exceeds the 10 MB limit");
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `homarr-board-snapshot-${snapshot.capturedAt.replaceAll(":", "-")}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
