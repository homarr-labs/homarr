import { ORPCError } from "@orpc/server";

import type { FixtureConfig } from "../context/config";

export function assertLocalOrigin(request: Request, config: FixtureConfig): void {
  let configured: URL;
  let requested: URL;
  try {
    configured = new URL(config.origin);
    requested = new URL(request.url);
  } catch {
    throw new ORPCError("FORBIDDEN", { data: { reason: "fixture-origin" } });
  }
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if (
    configured.protocol !== "http:" ||
    !["127.0.0.1", "localhost", "[::1]"].includes(configured.hostname) ||
    configured.origin !== config.origin ||
    configured.host !== config.host ||
    configured.username ||
    configured.password ||
    configured.pathname !== "/" ||
    configured.search ||
    configured.hash ||
    requested.username ||
    requested.password ||
    requested.origin !== config.origin ||
    request.headers.get("host") !== config.host ||
    (origin !== null && origin !== config.origin) ||
    (site !== null && site !== "same-origin" && site !== "none")
  ) {
    throw new ORPCError("FORBIDDEN", { data: { reason: "fixture-origin" } });
  }
}

export function assertMutationOrigin(request: Request, config: FixtureConfig): void {
  assertLocalOrigin(request, config);
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method) || request.headers.get("origin") !== config.origin) {
    throw new ORPCError("FORBIDDEN", { data: { reason: "fixture-mutation-origin" } });
  }
}
