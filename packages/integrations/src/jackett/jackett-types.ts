import { z } from "@homarr/validation";

export const indexersSchema = z.object({
  Indexers: z.array(
    z.object({
      ID: z.string(),
      Name: z.string(),
      Results: z.number(),
    }),
  ),
});

export const responseSchema = z.object({
  Results: z.array(
    z.object({
      TrackerId: z.string(), // Corresponds to `trackerId`
      Guid: z.string().transform((url) => {
        const urlPattern = /^(https?:\/\/[^/]+)\//;
        const match = urlPattern.exec(url);
        return match ? match[1] : url; // Return base URL or the original string if no match
      }),
    }),
  ),
});

export const indexerResponseSchema = z.object({
  Indexers: indexersSchema.shape.Indexers,
  Results: responseSchema.shape.Results,
});
