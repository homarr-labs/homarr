import { extract } from "@extractus/feed-extractor";
import type { FeedData, FeedEntry } from "@extractus/feed-extractor";
import { z } from "zod/v4";

import type { Modify } from "@homarr/common/types";

import type { OwnedRequestFactories } from "./factories";
import type { WidgetBindingLog, WidgetHttpResources } from "./resources";

interface ExtendedFeedEntry extends FeedEntry {
  feedUrl: string;
  enclosure?: string;
}
type ExtendedFeedData = Modify<FeedData, { entries?: ExtendedFeedEntry[] }>;

const dataSchema = z.object({ error: z.object({ description: z.string() }) }).or(
  z.object({
    chart: z.object({
      result: z.array(
        z.object({
          indicators: z.object({ quote: z.array(z.object({ close: z.array(z.number().nullish()) })) }),
          meta: z.object({ symbol: z.string(), shortName: z.string(), previousClose: z.number().optional() }),
        }),
      ),
    }),
  }),
);
const responseSchema = z.object({ online: z.literal(false) }).or(
  z.object({
    online: z.literal(true),
    players: z.object({ online: z.number(), max: z.number() }),
    icon: z.string().optional(),
  }),
);

export const createPublicWidgetRequests = (
  factories: OwnedRequestFactories,
  http: WidgetHttpResources,
  logger: WidgetBindingLog,
) => {
  const stockPrice = factories.createWidgetRequestHandler({
    requestTimeoutMs: 10_000,
    async requestAsync(input: { stock: string; timeRange: string; timeInterval: string }, signal) {
      const response = await http.fetchAsync(
        `https://query1.finance.yahoo.com/v8/finance/chart/${input.stock}?range=${input.timeRange}&interval=${input.timeInterval}`,
        { signal },
      );
      const data = dataSchema.parse(await response.json());
      if ("error" in data) throw new Error(data.error.description);
      if (data.chart.result.length !== 1) throw new Error("Received multiple results");
      const firstResult = data.chart.result[0];
      if (!firstResult) throw new Error("Received invalid data");
      const priceHistory =
        firstResult.indicators.quote[0]?.close.filter((value) => value !== null && value !== undefined) ?? [];
      return {
        priceHistory,
        previousClose: firstResult.meta.previousClose ?? priceHistory[0] ?? 1,
        symbol: firstResult.meta.symbol,
        shortName: firstResult.meta.shortName,
      };
    },
  });
  const minecraft = factories.createWidgetRequestHandler({
    requestTimeoutMs: 10_000,
    async requestAsync(input: { domain: string; isBedrockServer: boolean }, signal) {
      const path = `${input.isBedrockServer ? "/bedrock" : ""}/3/${input.domain}`;
      const response = await http.fetchAsync(`https://api.mcsrvstat.us${path}`, { signal });
      return responseSchema.parse(await response.json());
    },
  });
  const mediaProperties = ["enclosure", "media:content", "media:thumbnail"] as const;
  const getFirstMediaProperty = (feedObject: object) => {
    for (const mediaProperty of mediaProperties) {
      const mediaValue: unknown = Object.entries(feedObject).find(([key]) => key === mediaProperty)?.[1];
      const mediaEntries: unknown[] = Array.isArray(mediaValue) ? mediaValue : [mediaValue];
      for (const mediaEntry of mediaEntries) {
        if (mediaEntry === null || typeof mediaEntry !== "object") continue;
        const url: unknown = Object.entries(mediaEntry).find(([key]) => key === "@_url")?.[1];
        const result = z.string().url().safeParse(url);
        if (!result.success) continue;
        logger.debug(`Found an image in the feed entry: ${result.data}`);
        return result.data;
      }
    }
    return null;
  };
  const getImageFromStringAsFallback = (feedUrl: string, content: string) => {
    const regex =
      /https?:\/\/[^\s"'<>\\]+?\.(jpg|jpeg|png|gif|bmp|svg|webp|tiff)\b(?:\?[^\s"'<>\\#]*)?(?:#[^\s"'<>\\]*)?/i;
    const result = regex.exec(content);
    if (result === null) return null;
    logger.debug(
      `Falling back to regex image search for '${feedUrl}'. Found ${result.length} matches in content: ${content}`,
    );
    return result[0];
  };
  const attemptGetImageFromEntry = (feedUrl: string, entry: object) => {
    const media = getFirstMediaProperty(entry);
    if (media !== null) return media;
    return getImageFromStringAsFallback(feedUrl, JSON.stringify(entry));
  };
  const rssFeeds = factories.createWidgetRequestHandler({
    async requestAsync(input: { url: string; count: number; descriptionMaxLength: number }, signal) {
      const result = (await extract(
        input.url,
        {
          descriptionMaxLen: input.descriptionMaxLength,
          getExtraEntryFields: (entry) => {
            const media = attemptGetImageFromEntry(input.url, entry);
            return media ? { enclosure: media } : {};
          },
        },
        { signal },
      )) as ExtendedFeedData;
      return {
        ...result,
        entries: result.entries?.map((entry) => ({ ...entry, feedUrl: input.url })).slice(0, input.count) ?? [],
      };
    },
  });
  return { stockPrice, minecraft, rssFeeds };
};
