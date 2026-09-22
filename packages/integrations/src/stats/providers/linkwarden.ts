import { z } from "zod";

import { fetchStatsGroupsAsync } from "../types";
import type { StatsAuthenticationContext, StatsProvider } from "../types";

const countSchema = z.number().finite().int().nonnegative();

const collectionSchema = z.object({
  _count: z.object({
    links: countSchema,
  }),
});

const collectionEnvelopeSchema = z.union([
  z.array(collectionSchema),
  z.object({ response: z.array(collectionSchema) }),
  z.object({ data: z.object({ collections: z.array(collectionSchema) }) }),
]);

const tagSchema = z.record(z.string(), z.unknown());
const tagEnvelopeSchema = z.union([
  // Prefer the paginated envelope when v1 also includes a legacy response field.
  z.object({ data: z.object({ tags: z.array(tagSchema), nextCursor: z.union([countSchema, z.string()]).nullish() }) }),
  z.object({ response: z.array(tagSchema) }),
  z.array(tagSchema),
]);

const statsSchema = z.object({
  links: countSchema,
  collections: countSchema,
  tags: countSchema,
});

function collectionList(value: unknown) {
  const parsed = collectionEnvelopeSchema.parse(value);
  if (Array.isArray(parsed)) return parsed;
  if ("response" in parsed) return parsed.response;
  return parsed.data.collections;
}

function tagPage(value: unknown) {
  const parsed = tagEnvelopeSchema.parse(value);
  if (Array.isArray(parsed)) return { tags: parsed, nextCursor: null };
  if ("data" in parsed) return parsed.data;
  return { tags: parsed.response, nextCursor: null };
}

const getHttpAuthentication = (context: StatsAuthenticationContext) => ({
  headers: { Authorization: `Bearer ${context.secret("apiKey")}` },
});

export const linkwardenStatsProvider = {
  getHttpAuthentication,
  metrics: [
    { key: "links", label: "Links", unit: "count" },
    { key: "collections", label: "Collections", unit: "count" },
    { key: "tags", label: "Tags", unit: "count" },
  ],
  async fetchAsync(context) {
    const headers = getHttpAuthentication(context).headers;
    return await fetchStatsGroupsAsync([
      {
        metrics: ["links", "collections"],
        fetchAsync: async () => {
          const response = await context.requestAsync("/api/v1/collections", { headers, signal: context.signal });
          const collections = collectionList(response);
          return statsSchema.pick({ links: true, collections: true }).parse({
            links: collections.reduce((total, collection) => total + collection._count.links, 0),
            collections: collections.length,
          });
        },
      },
      {
        metrics: ["tags"],
        fetchAsync: async () => {
          let page = tagPage(await context.requestAsync("/api/v1/tags", { headers, signal: context.signal }));
          let tags = page.tags.length;
          const visited = new Set<string>();
          while (page.nextCursor != null) {
            context.signal.throwIfAborted();
            const cursor = String(page.nextCursor);
            if (visited.has(cursor) || visited.size >= 1000)
              throw new Error("Invalid or excessive Linkwarden tag pagination");
            visited.add(cursor);
            page = tagPage(
              await context.requestAsync(`/api/v1/tags?cursor=${encodeURIComponent(cursor)}`, {
                headers,
                signal: context.signal,
              }),
            );
            tags += page.tags.length;
          }
          return { tags: countSchema.parse(tags) };
        },
      },
    ]);
  },
} satisfies StatsProvider;
