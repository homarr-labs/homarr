import { serialize } from "superjson";

/**
 * AI SDK model messages only accept JSON-compatible tool results. Homarr's tRPC callers can
 * return richer values such as Date, bigint, Map, Set, NaN, and nested undefined values.
 * SuperJSON's transport representation normalizes those values without restoring their runtime
 * types, keeping subsequent agent steps valid while preserving the useful data.
 */
export const toAssistantToolOutput = (value: unknown) => serialize(value as Parameters<typeof serialize>[0]).json;
