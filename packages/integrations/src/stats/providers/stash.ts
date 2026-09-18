import { z } from "zod";

import type { StatsProvider } from "../types";

const countSchema = z.number().finite().int().nonnegative();
const measurementSchema = z.number().finite().nonnegative();

const statsSchema = z
  .object({
    scene_count: countSchema,
    scenes_size: measurementSchema,
    scenes_duration: measurementSchema,
    image_count: countSchema,
    images_size: measurementSchema,
    gallery_count: countSchema,
    performer_count: countSchema,
    studio_count: countSchema,
    tag_count: countSchema,
  })
  .strict();

const responseSchema = z
  .object({
    data: z.object({ stats: statsSchema }).strict(),
    errors: z.never().optional(),
  })
  .strict();

const query = `query {
  stats {
    scene_count
    scenes_size
    scenes_duration
    image_count
    images_size
    gallery_count
    performer_count
    studio_count
    tag_count
  }
}`;

export const stashStatsProvider = {
  metrics: [
    { key: "scenes", label: "Scenes", unit: "count" },
    { key: "sceneBytes", label: "Scene size", unit: "bytes" },
    { key: "sceneDuration", label: "Scene duration", unit: "seconds" },
    { key: "images", label: "Images", unit: "count" },
    { key: "imageBytes", label: "Image size", unit: "bytes" },
    { key: "galleries", label: "Galleries", unit: "count" },
    { key: "performers", label: "Performers", unit: "count" },
    { key: "studios", label: "Studios", unit: "count" },
    { key: "tags", label: "Tags", unit: "count" },
  ],
  async fetchAsync(context) {
    const response = await context.requestAsync("/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", ApiKey: context.secret("apiKey") },
      body: JSON.stringify({ query }),
      signal: context.signal,
    });
    const stats = responseSchema.parse(response).data.stats;

    return {
      scenes: stats.scene_count,
      sceneBytes: stats.scenes_size,
      sceneDuration: stats.scenes_duration,
      images: stats.image_count,
      imageBytes: stats.images_size,
      galleries: stats.gallery_count,
      performers: stats.performer_count,
      studios: stats.studio_count,
      tags: stats.tag_count,
    };
  },
} satisfies StatsProvider;
