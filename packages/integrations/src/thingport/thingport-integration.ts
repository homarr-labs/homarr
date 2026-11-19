import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { ImageProxy } from "@homarr/image-proxy";

import type { IntegrationTestingInput } from "../base/integration";
import type { ISearchableIntegration } from "../base/searchable-integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type {
  ThingportActivity,
  ThingportActivityDay,
  ThingportFeaturedModel,
  ThingportLibraryStats,
  ThingportMeshFormat,
  ThingportModel,
  ThingportModelList,
  ThingportSearchResult,
} from "./thingport-types";
import {
  thingportActivityKinds,
  thingportActivitySchema,
  thingportFeaturedSchema,
  thingportModelSchema,
  thingportSearchSchema,
  thingportSummarySchema,
} from "./thingport-types";

// Thingport has no "recently added" dashboard list beyond the three in its summary, so that one is the library
// itself, newest first.
const modelListRequests = {
  recentlyAdded: (limit: number) => ({ path: "/api/prints", query: { orderBy: "newest", limit: String(limit) } }),
  topViewed: () => ({ path: "/api/dashboard/top-viewed", query: undefined }),
  topPrinted: () => ({ path: "/api/dashboard/top-printed", query: undefined }),
} as const satisfies Record<
  ThingportModelList,
  (limit: number) => { path: `/${string}`; query: Record<string, string> | undefined }
>;

// Thingport caps a search at 25; the search palette has room for fewer.
const SEARCH_MODEL_LIMIT = 10;

export class ThingportIntegration extends Integration implements ISearchableIntegration<ThingportSearchResult> {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    // The health route is public, so only an authenticated route proves the API token works.
    const response = await input.fetchAsync(this.url("/api/dashboard/summary"), {
      headers: this.getAuthHeaders(),
      signal: AbortSignal.timeout(30_000),
      redirect: "error",
    });

    if (!response.ok) {
      return TestConnectionError.StatusResult(response);
    }

    return { success: true };
  }

  public async getLibraryStatsAsync(signal = AbortSignal.timeout(30_000)): Promise<ThingportLibraryStats> {
    const summary = thingportSummarySchema.parse(
      await this.fetchJsonAsync("/api/dashboard/summary", undefined, signal),
    );
    // Thingport has no category or author index page, so those open the dashboard, as its own count cards do.
    const dashboard = this.externalUrl("/").toString();

    return {
      modelCount: summary.model_count,
      collectionCount: summary.collection_count,
      categoryCount: summary.category_count,
      authorCount: summary.author_count,
      links: {
        models: this.externalUrl("/models").toString(),
        collections: this.externalUrl("/models/collections").toString(),
        categories: dashboard,
        authors: dashboard,
      },
    };
  }

  public async getModelsAsync(
    list: ThingportModelList,
    limit: number,
    signal = AbortSignal.timeout(30_000),
  ): Promise<ThingportModel[]> {
    const request = modelListRequests[list](limit);
    const models = thingportModelSchema
      .array()
      .parse(await this.fetchJsonAsync(request.path, request.query, signal))
      .slice(0, limit);

    // Thumbnails need the API token, which must never reach the browser, so they go through the image proxy.
    const thumbnailSources = models.flatMap((model) => (model.thumb_url ? [this.apiUrl(model.thumb_url)] : []));
    const thumbnailLinks = (await new ImageProxy().createImagesAsync(thumbnailSources, this.getAuthHeaders())).values();

    return models.map((model) => ({
      id: model.id,
      name: model.name,
      href: this.modelHref(model.id),
      thumbnailUrl: model.thumb_url ? (thumbnailLinks.next().value ?? null) : null,
      viewCount: model.view_count,
      printCount: model.print_count,
      createdAt: model.created_at,
    }));
  }

  /** Thingport picks one model a day; `date` is the viewer's local day, so it changes at their midnight. */
  public async getFeaturedModelAsync(
    date: string,
    signal = AbortSignal.timeout(30_000),
  ): Promise<ThingportFeaturedModel | null> {
    const { print } = thingportFeaturedSchema.parse(
      await this.fetchJsonAsync("/api/dashboard/featured", { date }, signal),
    );
    const plate = print?.plates[0];
    if (!print || !plate) return null;

    // The server pre-renders a GLB for 3MF plates; an STL plate is light enough to draw as it is.
    // STEP, OBJ and 3MF without a preview fall back to the thumbnail.
    let mesh: { source: string; format: ThingportMeshFormat } | null = null;
    if (plate.preview_glb_url) mesh = { source: plate.preview_glb_url, format: "glb" };
    else if (plate.filename.toLowerCase().endsWith(".stl")) mesh = { source: plate.url, format: "stl" };

    const thumbnail = plate.thumb_url ?? print.thumb_url ?? null;
    const imageProxy = new ImageProxy();
    const headers = this.getAuthHeaders();
    const [thumbnailUrl, meshUrl] = await Promise.all([
      thumbnail ? imageProxy.createImageAsync(this.apiUrl(thumbnail), headers) : null,
      mesh ? imageProxy.createImageAsync(this.apiUrl(mesh.source), headers) : null,
    ]);

    return {
      id: print.id,
      name: print.name,
      href: this.modelHref(print.id),
      thumbnailUrl,
      author: print.author?.name ?? print.author?.handle ?? null,
      category: print.category_name ?? null,
      viewCount: print.view_count,
      printCount: print.print_count,
      mesh: mesh && meshUrl ? { url: meshUrl, format: mesh.format } : null,
    };
  }

  /** `from`/`to` are inclusive YYYY-MM-DD days, counted in the `timeZone` the board is viewed in. */
  public async getActivityAsync(
    from: string,
    to: string,
    timeZone: string,
    signal = AbortSignal.timeout(30_000),
  ): Promise<ThingportActivity> {
    const activity = thingportActivitySchema.parse(
      await this.fetchJsonAsync("/api/activity", { from, to, tz: timeZone }, signal),
    );

    return {
      days: activity.days.map((day) => {
        const counts: ThingportActivityDay["counts"] = {};
        for (const kind of thingportActivityKinds) {
          const count = day.counts[kind];
          if (count) counts[kind] = count;
        }
        return { date: day.date, counts };
      }),
      total: activity.total,
      years: activity.years,
      profileUrl: this.externalUrl("/profile").toString(),
    };
  }

  /** Models first, as Thingport ranks them, then matching collections and tags. */
  public async searchAsync(query: string, signal = AbortSignal.timeout(30_000)): Promise<ThingportSearchResult[]> {
    // The search router hands over the query already passed through encodeURI; the URL builder encodes it again.
    const q = decodeURI(query).trim();
    if (!q) return [];

    const result = thingportSearchSchema.parse(
      await this.fetchJsonAsync("/api/search", { q, limit: String(SEARCH_MODEL_LIMIT) }, signal),
    );

    const thumbnailSources = result.models.flatMap((model) => (model.thumb_url ? [this.apiUrl(model.thumb_url)] : []));
    const thumbnailLinks = (await new ImageProxy().createImagesAsync(thumbnailSources, this.getAuthHeaders())).values();

    const models = result.models.map((model) => {
      const details = [model.author?.name ?? model.author?.handle, model.category_name].filter(Boolean).join(" · ");
      return {
        name: model.name,
        link: this.modelHref(model.id),
        image: model.thumb_url ? thumbnailLinks.next().value : undefined,
        text: details || undefined,
      };
    });
    const collections = result.collections.map((collection) => ({
      name: collection.name,
      link: this.externalUrl(`/models/collections/${encodeURIComponent(collection.id)}`).toString(),
    }));
    const tags = result.tags.map((tag) => ({
      name: `#${tag.tag}`,
      link: this.externalUrl(`/models/tags/${encodeURIComponent(tag.tag)}`).toString(),
    }));

    return [...models, ...collections, ...tags];
  }

  private apiUrl(relativePath: string): string {
    const target = this.url(`/api${relativePath}` as `/${string}`);
    const apiBase = this.url("/api");
    if (
      !relativePath.startsWith("/") ||
      relativePath.startsWith("//") ||
      relativePath.includes("\\") ||
      target.hash ||
      target.origin !== apiBase.origin ||
      !target.pathname.startsWith(`${apiBase.pathname}/`)
    ) {
      throw new Error("Thingport media must stay within the integration API path");
    }
    return target.toString();
  }

  private modelHref(id: string): string {
    return this.externalUrl(`/models/${encodeURIComponent(id)}`).toString();
  }

  private async fetchJsonAsync(
    path: `/${string}`,
    queryParams?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const response = await fetchWithTrustedCertificatesAsync(this.url(path, queryParams), {
      headers: this.getAuthHeaders(),
      signal,
      redirect: "error",
    });
    if (!response.ok) {
      throw new ResponseError(response);
    }
    return await response.json();
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
    };
  }
}
