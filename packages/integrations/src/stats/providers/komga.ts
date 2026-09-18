import { z } from "zod";

import type { StatsAuthenticationContext, StatsProvider } from "../types";

const countSchema = z.number().finite().nonnegative().int();
const librarySchema = z.object({ unavailable: z.boolean().optional() }).passthrough();
const pageSchema = z.object({ totalElements: countSchema }).passthrough();

const getHttpAuthentication = (context: StatsAuthenticationContext) => ({
  headers: { "X-API-Key": context.secret("apiKey") },
});

export const komgaStatsProvider = {
  getHttpAuthentication,
  metrics: [
    { key: "libraries", label: "Libraries", unit: "count" },
    { key: "series", label: "Series", unit: "count" },
    { key: "books", label: "Books", unit: "count" },
  ],
  async fetchAsync(context) {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...getHttpAuthentication(context).headers,
    };
    const [librariesResponse, seriesResponse, booksResponse] = await Promise.all([
      context.requestAsync("/api/v1/libraries", { headers, signal: context.signal }),
      context.requestAsync("/api/v1/series/list", { method: "POST", headers, body: "{}", signal: context.signal }),
      context.requestAsync("/api/v1/books/list", { method: "POST", headers, body: "{}", signal: context.signal }),
    ]);
    const libraries = z.array(librarySchema).parse(librariesResponse);
    const series = pageSchema.parse(seriesResponse);
    const books = pageSchema.parse(booksResponse);

    return {
      libraries: libraries.filter((library) => !library.unavailable).length,
      series: series.totalElements,
      books: books.totalElements,
    };
  },
} satisfies StatsProvider;
