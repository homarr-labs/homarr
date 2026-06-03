export type TrueNasApiKind = "jsonRpc" | "legacy";

export type TrueNasResponse = { result: unknown } | { error: unknown };

export interface TrueNasApi {
  kind: TrueNasApiKind;
  /** Websocket path appended to the integration URL. */
  path: `/${string}`;
  /** The legacy DDP API requires a "connect" handshake before authentication, the JSON-RPC API does not. */
  requiresSessionHandshake: boolean;
  /** Builds the request envelope for a method call. */
  buildRequest: (id: string, method: string, params: unknown[]) => Record<string, unknown>;
  /**
   * Returns the response payload when `message` is the reply to `id`,
   * otherwise `undefined` so the caller keeps waiting for a later message.
   */
  matchResponse: (message: Record<string, unknown>, id: string) => TrueNasResponse | undefined;
}

/**
 * JSON-RPC 2.0 API introduced in TrueNAS SCALE 24.10 (Electric Eel) and the
 * legacy DDP-style websocket API used before it. Both expose the same
 * middleware methods, so only the transport envelope differs.
 * @see https://www.truenas.com/docs/api/scale_rest_api.html
 * @see https://www.truenas.com/docs/api/scale_websocket_api.html#websocket_protocol
 */
export const trueNasApis = {
  jsonRpc: {
    kind: "jsonRpc",
    path: "/api/current",
    requiresSessionHandshake: false,
    buildRequest: (id: string, method: string, params: unknown[]) => ({ jsonrpc: "2.0", id, method, params }),
    matchResponse: (message: Record<string, unknown>, id: string) => {
      if (message.id !== id || message.jsonrpc !== "2.0") return undefined;
      if (message.error != null) return { error: message.error };
      return { result: message.result };
    },
  },
  legacy: {
    kind: "legacy",
    path: "/websocket",
    requiresSessionHandshake: true,
    buildRequest: (id: string, method: string, params: unknown[]) => ({ id, msg: "method", method, params }),
    matchResponse: (message: Record<string, unknown>, id: string) => {
      if (message.id !== id || message.msg !== "result") return undefined;
      if (message.error != null) return { error: message.error };
      return { result: message.result };
    },
  },
} satisfies Record<TrueNasApiKind, TrueNasApi>;
