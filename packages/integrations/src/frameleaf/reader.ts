import { z } from "zod/v4";

import { readBoundedJsonResponseAsync } from "@homarr/common/server";

import { FrameleafConnection, FrameleafConnectionError } from "./connection";
import type { FrameleafFetch, FrameleafStore } from "./connection";
import { frameleafFetch } from "./transport";

export class FrameleafReader {
  private readonly connection: FrameleafConnection;
  constructor(
    private readonly store: FrameleafStore,
    private readonly fetchAsync: FrameleafFetch = frameleafFetch,
  ) {
    this.connection = new FrameleafConnection(store, fetchAsync);
  }
  private async requestAsync(path: string, signal?: AbortSignal) {
    const token = await this.connection.accessTokenAsync();
    const state = await this.store.readAsync();
    if (!state || !("tokens" in state) || !state.connection) throw new FrameleafConnectionError("reconnect");
    let response: Response;
    try {
      response = await this.fetchAsync(`${state.origin}/api/connect${path}`, {
        headers: { authorization: `Bearer ${token}` },
        redirect: "error",
        cache: "no-store",
        signal: signal ?? AbortSignal.timeout(10000),
      });
    } catch {
      throw new FrameleafConnectionError("unavailable");
    }
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 401 || response.status === 403) await this.connection.markRevokedAsync(token);
      const error = new FrameleafConnectionError(
        response.status === 429
          ? "rateLimit"
          : response.status === 401 || response.status === 403
            ? "reconnect"
            : "unavailable",
      );
      if (response.status === 429) {
        const retry = response.headers.get("retry-after");
        error.retryAfter = Math.min(
          3600,
          Math.max(
            1,
            retry && /^\d+$/.test(retry)
              ? Number(retry)
              : retry
                ? Math.ceil((Date.parse(retry) - Date.now()) / 1000) || 60
                : 60,
          ),
        );
      }
      throw error;
    }
    return { response, state, connection: state.connection };
  }
  async albumsAsync() {
    const { response } = await this.requestAsync("/albums");
    return z
      .object({ items: z.array(z.object({ id: z.uuid(), name: z.string().max(2048), canRead: z.boolean() })) })
      .parse(await readBoundedJsonResponseAsync(response, 262144))
      .items.filter((album) => album.canRead);
  }
  async pageAsync(albumId: string, page: number) {
    z.uuid().parse(albumId);
    z.number().int().min(1).max(10000000).parse(page);
    const { response: capabilitiesResponse, connection } = await this.requestAsync("/capabilities");
    const capabilities = z
      .object({
        protocolVersion: z.literal(1),
        policyRevision: z.number().int().min(1),
        connection: z.object({ grantId: z.string(), libraryUserId: z.string() }),
      })
      .parse(await readBoundedJsonResponseAsync(capabilitiesResponse, 262144));
    if (
      capabilities.connection.grantId !== connection.grantId ||
      capabilities.connection.libraryUserId !== connection.libraryUserId
    )
      throw new FrameleafConnectionError("reconnect");
    const { response } = await this.requestAsync(
      `/assets?${new URLSearchParams({ albumId, page: String(page), size: "1", type: "IMAGE" })}`,
    );
    const result = z
      .object({
        total: z.number().int().nonnegative(),
        items: z
          .array(
            z.object({
              id: z.uuid(),
              type: z.literal("IMAGE"),
              title: z.string().nullable(),
              description: z.string().nullable(),
              updatedAt: z.string(),
            }),
          )
          .max(1),
      })
      .parse(await readBoundedJsonResponseAsync(response, 262144));
    return { ...result, grantId: capabilities.connection.grantId, policyRevision: capabilities.policyRevision };
  }
  async displayAsync(assetId: string, signal: AbortSignal) {
    z.uuid().parse(assetId);
    return (await this.requestAsync(`/assets/${assetId}/rendition?variant=display`, signal)).response;
  }
}
