import { z } from "zod";

import type { StatsProvider } from "../types";

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
  z.array(tagSchema),
  z.object({ response: z.array(tagSchema) }),
  z.object({ data: z.object({ tags: z.array(tagSchema) }) }),
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

function tagList(value: unknown) {
  const parsed = tagEnvelopeSchema.parse(value);
  if (Array.isArray(parsed)) return parsed;
  if ("response" in parsed) return parsed.response;
  return parsed.data.tags;
}

export const linkwardenStatsProvider = {
  metrics: [
    { key: "links", label: "Links", unit: "count" },
    { key: "collections", label: "Collections", unit: "count" },
    { key: "tags", label: "Tags", unit: "count" },
  ],
  async fetchAsync(context) {
    const headers = { Authorization: `Bearer ${context.secret("apiKey")}` };
    const [collectionsResponse, tagsResponse] = await Promise.all([
      context.requestAsync("/api/v1/collections", { headers, signal: context.signal }),
      context.requestAsync("/api/v1/tags", { headers, signal: context.signal }),
    ]);
    const collections = collectionList(collectionsResponse);
    const tags = tagList(tagsResponse);

    return statsSchema.parse({
      links: collections.reduce((total, collection) => total + collection._count.links, 0),
      collections: collections.length,
      tags: tags.length,
    });
  },
} satisfies StatsProvider;
