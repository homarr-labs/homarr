import { z } from "zod/v4";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { Integration } from "../../base/integration";
import type { IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IMediaOrganizerIntegration } from "../../interfaces/media-organizer/media-organizer-integration";
import type { MissingMediaItem, QueuedMediaItem } from "../../interfaces/media-organizer/media-organizer-types";

/**
 * Bindery (https://github.com/vavallee/bindery) is a Sonarr/Radarr-style
 * manager for ebooks and audiobooks. Unlike Sonarr/Radarr it does not expose
 * server-side pagination on its missing/queue endpoints, so both methods below
 * fetch the full response and page it client-side.
 */
export class BinderyIntegration extends Integration implements IMediaOrganizerIntegration {
  async getMissingAsync(pageSize = 10): Promise<{ items: MissingMediaItem[]; totalCount: number }> {
    const url = this.url("/api/v1/wanted/missing");

    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: { "X-Api-Key": super.getSecretValue("apiKey") },
    });
    // Bindery returns a bare array here (no {items,total} wrapper and no
    // pagination query params), unlike /api/v1/book which is paginated.
    const books = await z.array(binderyMissingBookSchema).parseAsync(await response.json());

    return {
      totalCount: books.length,
      items: books.slice(0, pageSize).map(
        (book): MissingMediaItem => ({
          id: book.id,
          title: book.title,
          type: "book",
          year: book.releaseDate ? new Date(book.releaseDate).getUTCFullYear() : undefined,
          seriesTitle: book.author?.authorName,
          // This endpoint returns a direct, unauthenticated provider image URL
          // (e.g. assets.hardcover.app). /api/v1/book's imageUrl is instead a
          // Bindery-proxied path that requires auth and would 401 in the
          // browser, so only pass through absolute URLs from here.
          imageUrl: book.imageUrl?.startsWith("http") ? book.imageUrl : null,
          link: this.externalUrl(`/book/${book.id}`).toString(),
        }),
      ),
    };
  }

  async getMediaQueueAsync(pageSize = 10): Promise<{ items: QueuedMediaItem[]; totalCount: number }> {
    const url = this.url("/api/v1/queue");

    const response = await fetchWithTrustedCertificatesAsync(url, {
      headers: { "X-Api-Key": super.getSecretValue("apiKey") },
    });
    const data = await z.object({ items: z.array(binderyQueueItemSchema) }).parseAsync(await response.json());

    // Bindery's queue endpoint returns its entire historical log rather than
    // just in-flight downloads (observed live: 522 of 555 rows were already
    // "imported"). Exclude those so the widget shows what's actually active.
    const activeItems = data.items.filter((item) => item.status !== "imported");

    return {
      totalCount: activeItems.length,
      items: activeItems.slice(0, pageSize).map((item): QueuedMediaItem => {
        const percentComplete = item.percentage ? Math.round(Number.parseFloat(item.percentage)) : 0;
        // Observed live: a completed-but-blocked item reported percentage
        // "100.0" alongside a stale timeLeft ("721h 20m") left over from
        // whatever chunked-progress state produced it. A 100%-complete item
        // has no meaningful time remaining, so don't surface that value.
        const timeLeft = percentComplete >= 100 ? null : (item.timeLeft ?? null);

        return {
          id: item.id,
          title: item.book?.title ?? item.title,
          type: "book",
          status: item.status,
          timeLeft,
          percentComplete,
          seriesTitle: item.book?.authorName,
          imageUrl: null, // the queue endpoint does not return cover art
          link: item.book?.id ? this.externalUrl(`/book/${item.book.id}`).toString() : this.externalUrl("/queue").toString(),
        };
      }),
    };
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/v1/system/status"), {
      headers: { "X-Api-Key": super.getSecretValue("apiKey") },
    });

    if (!response.ok) return TestConnectionError.StatusResult(response);

    await response.json();
    return { success: true };
  }
}

const binderyMissingBookSchema = z.object({
  id: z.number(),
  title: z.string(),
  releaseDate: z.string().optional(),
  imageUrl: z.string().optional().nullable(),
  author: z
    .object({
      authorName: z.string(),
    })
    .optional(),
});

const binderyQueueItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.string(),
  percentage: z.string().optional(),
  timeLeft: z.string().optional().nullable(),
  book: z
    .object({
      id: z.number().optional(),
      title: z.string(),
      authorName: z.string().optional(),
    })
    .optional(),
});
